// Budget for AGENTS.md: it is read into every agent's context, so bloat is a
// standing cost. Fail CI rather than let prose creep back in.
import { readFileSync } from 'node:fs';

const MAX_BYTES = 16 * 1024;
const MAX_LINE_CHARS = 640;

const text = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8');
const bytes = Buffer.byteLength(text);
const failures = [];

if (bytes > MAX_BYTES) {
  failures.push(`AGENTS.md is ${bytes} bytes; budget is ${MAX_BYTES}. Cut prose, not rules.`);
}

text.split('\n').forEach((line, i) => {
  if (line.length > MAX_LINE_CHARS) {
    failures.push(`AGENTS.md:${i + 1} is ${line.length} chars; budget is ${MAX_LINE_CHARS} per line. Split it or cut the justification.`);
  }
});

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
