// Runs in GitHub Actions every few minutes; writes status.json + history.json.
import fs from 'node:fs';
const SERVICES = [
  { id: 'website', name: 'amra.consulting website', url: 'https://amra.consulting/' },
  { id: 'app', name: 'CRM app (app.amra.consulting)', url: 'https://app.amra.consulting/login' },
  { id: 'chat', name: 'Website chat & forms', url: 'https://app.amra.consulting/widget.js' },
  { id: 'booking', name: 'Booking pages', url: 'https://app.amra.consulting/b/EANNh6gWHDrtDeP5ISGn/strategy-call' },
];
async function probe(s) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = Date.now();
    try {
      const r = await fetch(s.url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'amra-status/1.0' } });
      const ok = r.status < 400;
      if (ok || attempt === 1) return { id: s.id, name: s.name, ok, code: r.status, ms: Date.now() - t };
    } catch (e) {
      if (attempt === 1) return { id: s.id, name: s.name, ok: false, code: 0, ms: Date.now() - t, error: String(e.message || e).slice(0, 120) };
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
const results = await Promise.all(SERVICES.map(probe));
const now = new Date();
fs.writeFileSync('status.json', JSON.stringify({ checkedAt: now.toISOString(), services: results }, null, 1));
const day = now.toISOString().slice(0, 10);
let hist = {};
try { hist = JSON.parse(fs.readFileSync('history.json', 'utf8')); } catch {}
hist[day] ??= {};
for (const r of results) { const d = (hist[day][r.id] ??= [0, 0]); d[1]++; if (r.ok) d[0]++; }
const days = Object.keys(hist).sort().slice(-90);
hist = Object.fromEntries(days.map((d) => [d, hist[d]]));
fs.writeFileSync('history.json', JSON.stringify(hist));
console.log(results.map((r) => `${r.ok ? 'UP  ' : 'DOWN'} ${r.code} ${r.ms}ms ${r.name}`).join('\n'));
