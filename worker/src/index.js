import { sendPushNotification, generateVAPIDHeaders } from './web-push.js';
import { getMarketsWithCleaningOn } from './schedule.js';

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

    // Manual trigger for testing
    if (url.pathname === '/__scheduled' && request.method === 'GET') {
      await handleScheduled(env);
      return new Response('Cron triggered manually', { headers: corsHeaders });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },

  async scheduled(event, env) {
    await handleScheduled(env);
  },
};

async function handleSubscribe(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { subscription, markets } = body;

    if (!subscription || !subscription.endpoint || !markets || !Array.isArray(markets)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = encodeURIComponent(subscription.endpoint);
    await env.SUBSCRIPTIONS.put(key, JSON.stringify({ subscription, markets }));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleUnsubscribe(request, env, corsHeaders) {
  try {
    const body = await request.json();
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleScheduled(env) {
  const now = new Date();
  // SGT = UTC+8
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const sgtHour = sgt.getUTCHours();

  // Determine which date to check
  let targetDate;
  if (sgtHour < 12) {
    // Morning run (6am SGT): notify about TODAY
    targetDate = new Date(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate());
  } else {
    // Evening run (7pm SGT): notify about TOMORROW
    targetDate = new Date(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate() + 1);
  }

  const closedMarkets = await getMarketsWithCleaningOn(targetDate, env.DATA_GOV_API);
  if (closedMarkets.length === 0) return;

  const closedNames = new Set(closedMarkets.map(m => m.name));

  // Iterate all subscriptions
  const listed = await env.SUBSCRIPTIONS.list();
  const staleKeys = [];

  for (const key of listed.keys) {
    const data = await env.SUBSCRIPTIONS.get(key.name, 'json');
    if (!data) continue;

    const { subscription, markets } = data;
    const affected = markets.filter(m => closedNames.has(m));
    if (affected.length === 0) continue;

    const isToday = sgtHour < 12;
    const title = isToday ? '🛒 Market closed today' : '🛒 Market closed tomorrow';
    const marketNames = affected.map(name => {
      const match = name.match(/\((.+)\)/);
      return match ? match[1] : name;
    });
    const body = marketNames.join(', ') + (isToday ? ' is closed today for cleaning' : ' is closed tomorrow for cleaning');

    try {
      const success = await sendPushNotification(
        subscription,
        JSON.stringify({ title, body }),
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY,
        env.VAPID_SUBJECT
      );
      if (!success) {
        staleKeys.push(key.name);
      }
    } catch (e) {
      staleKeys.push(key.name);
    }
  }

  // Clean up expired subscriptions
  for (const key of staleKeys) {
    await env.SUBSCRIPTIONS.delete(key);
  }
}
