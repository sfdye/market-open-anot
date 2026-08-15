import type { PushSubscription } from 'web-push';
import { sendPushNotification } from './web-push';
import { getMarketsWithCleaningOn } from './schedule';

export interface Env {
  SUBSCRIPTIONS: KVNamespace;
  DATA_GOV_API: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

/** What the page posts to /subscribe and what we keep in KV, keyed by endpoint. */
interface StoredSubscription {
  subscription: PushSubscription;
  markets: string[];
  lang: string;
}

interface SendOutcome {
  endpoint: string;
  matched: boolean;
  sent?: boolean;
  error?: string;
}

interface Diagnostics {
  timestamp: string;
  sgtHour?: number;
  targetDate?: string;
  closedMarketsCount?: number;
  closedMarketNames?: string[];
  subscriptionCount?: number;
  staleRemoved?: number;
  results?: SendOutcome[];
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env, corsHeaders);
    }

    if (url.pathname === '/unsubscribe' && request.method === 'POST') {
      return handleUnsubscribe(request, env, corsHeaders);
    }

    if (url.pathname === '/vapid-public-key' && request.method === 'GET') {
      return new Response(JSON.stringify({ key: env.VAPID_PUBLIC_KEY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Manual trigger for testing with diagnostics
    if (url.pathname === '/__scheduled' && request.method === 'GET') {
      try {
        const result = await handleScheduled(env);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        const stack = e instanceof Error ? e.stack : undefined;
        return new Response(JSON.stringify({ error: errorMessage(e), stack }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },

  async scheduled(_event, env) {
    await handleScheduled(env);
  },
} satisfies ExportedHandler<Env>;

async function handleSubscribe(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<StoredSubscription>;
    const { subscription, markets, lang } = body;

    if (!subscription || !subscription.endpoint || !markets || !Array.isArray(markets)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = encodeURIComponent(subscription.endpoint);
    await env.SUBSCRIPTIONS.put(key, JSON.stringify({ subscription, markets, lang: lang || 'en' }));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: errorMessage(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleUnsubscribe(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = (await request.json()) as { endpoint?: string };
    const { endpoint } = body;

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = encodeURIComponent(endpoint);
    await env.SUBSCRIPTIONS.delete(key);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: errorMessage(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleScheduled(env: Env): Promise<Diagnostics> {
  const diag: Diagnostics = { timestamp: new Date().toISOString() };
  const now = new Date();
  // SGT = UTC+8
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const sgtHour = sgt.getUTCHours();

  // Determine which date to check
  let targetDate;
  if (sgtHour < 12) {
    targetDate = new Date(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate());
  } else {
    targetDate = new Date(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate() + 1);
  }

  diag.sgtHour = sgtHour;
  diag.targetDate = targetDate.toDateString();

  const closedMarkets = await getMarketsWithCleaningOn(targetDate, env.DATA_GOV_API);
  diag.closedMarketsCount = closedMarkets.length;
  diag.closedMarketNames = closedMarkets.map(m => m.name).slice(0, 5);

  if (closedMarkets.length === 0) return diag;

  const closedNames = new Set(closedMarkets.map(m => m.name));

  const listed = await env.SUBSCRIPTIONS.list();
  diag.subscriptionCount = listed.keys.length;

  const staleKeys: string[] = [];
  const results: SendOutcome[] = [];

  for (const key of listed.keys) {
    const data = await env.SUBSCRIPTIONS.get<StoredSubscription>(key.name, 'json');
    if (!data) continue;

    const { subscription, markets, lang } = data;
    const affected = markets.filter(m => closedNames.has(m));
    if (affected.length === 0) {
      results.push({ endpoint: subscription.endpoint.slice(0, 50), matched: false });
      continue;
    }

    const isToday = sgtHour < 12;
    const marketNames = affected.map(name => {
      const match = name.match(/\((.+)\)/);
      return match ? match[1] : name;
    });
    const names = marketNames.join(', ');
    let title, body;
    if (lang === 'zh') {
      title = isToday ? '🚫 今天关门（清洁）' : '⚠️ 明天关门（清洁）';
      body = isToday
        ? names + ' 今天关闭清洁 — 别白跑一趟！'
        : names + ' 明天关闭清洁 — 请改天再去。';
    } else {
      title = isToday ? '🚫 Closed today for cleaning' : '⚠️ Closed tomorrow for cleaning';
      body = isToday
        ? names + ' is closed — don\'t make the trip!'
        : names + ' is closed tomorrow — plan another day.';
    }

    try {
      const success = await sendPushNotification(
        subscription,
        JSON.stringify({ title, body }),
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY,
        env.VAPID_SUBJECT
      );
      results.push({ endpoint: subscription.endpoint.slice(0, 50), matched: true, sent: success });
      if (!success) {
        staleKeys.push(key.name);
      }
    } catch (e) {
      results.push({ endpoint: subscription.endpoint.slice(0, 50), matched: true, error: errorMessage(e) });
      staleKeys.push(key.name);
    }
  }

  // Clean up expired subscriptions
  diag.staleRemoved = staleKeys.length;
  for (const key of staleKeys) {
    await env.SUBSCRIPTIONS.delete(key);
  }

  diag.results = results;
  return diag;
}
