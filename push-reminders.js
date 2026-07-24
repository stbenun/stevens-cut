/* Weekly/daily reminder push sender (GitHub Action).
   Reads ALL reminder sources from the LIVE app (single source of truth) + the push subscription from the
   secret gist, and sends the ones due for the current run:
     MODE=morning : today's 🧊 defrost + ⚖️ weigh-in (fires ~6 AM ET, daily)
     MODE=friday  : 🥣 COR flavors + 🕯 Shabbat prep (fires ~3 PM ET, Fridays)
   The rotation logic (feast defrost, COR flavors) mirrors the app; the data comes from the app so it stays
   in sync. Two DST-shifted crons feed each mode; an ET-hour gate makes exactly one fire. */
const webpush = require('web-push');

const VAPID_PUBLIC = 'BBFdK2pympLwLgo4LwVVpkz1g9KOfRFQ9611TQOt7xYbNRHprxyz0ALB582eBsY8jo1E9-_e_f5Wvnzi4eFVXBg';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const GIST_ID = process.env.GIST_ID;
const MODE = (process.env.MODE || 'friday').trim();
const FORCE = process.env.FORCE === '1' || process.argv.includes('--force');
const FL_ANCHOR = new Date(2026, 5, 28); // mirror the app's FL_ANCHOR

function etNow() {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false, weekday: 'short' }).formatToParts(new Date());
  const g = t => p.find(x => x.type === t).value;
  return { y: +g('year'), mo: +g('month'), d: +g('day'), hour: (+g('hour')) % 24, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')) };
}
function grab(html, name) {
  const key = 'const ' + name + ' = ';
  const start = html.indexOf(key);
  if (start < 0) throw new Error('missing ' + name);
  const after = start + key.length;
  let end = html.indexOf('\nconst ', after);
  const endFn = html.indexOf('\nfunction ', after);
  if (endFn >= 0 && (end < 0 || endFn < end)) end = endFn;
  let blk = html.slice(after, end < 0 ? undefined : end);
  blk = blk.slice(0, Math.max(blk.lastIndexOf(']'), blk.lastIndexOf('}')) + 1);
  return eval('(' + blk + ')');
}

(async () => {
  if (!VAPID_PRIVATE || !GIST_ID) { console.error('Missing VAPID_PRIVATE_KEY or GIST_ID'); process.exit(1); }
  const et = etNow();
  const wantHour = MODE === 'friday' ? 15 : 6;
  if (!FORCE && et.hour !== wantHour) { console.log(`ET hour ${et.hour} != ${wantHour} for MODE=${MODE} — skipping.`); return; }

  const html = await (await fetch('https://stbenun.github.io/stevens-cut/index.html?cb=' + Date.now())).text();
  const CS = grab(html, 'COR_SETS');
  const RM = grab(html, 'REMIND_MIRROR');
  const SF = grab(html, 'SHABBAT_FEAST');
  const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
  const cor = spec => spec.split(' COR')[0].trim().replace(/&amp;/g, '&');
  const clean = t => String(t).replace(/&amp;/g, '&');
  const dow = et.dow;
  const day = new Date(et.y, et.mo - 1, et.d, 12, 0, 0);
  const sun = new Date(day); sun.setDate(day.getDate() - day.getDay()); sun.setHours(12, 0, 0, 0);
  const wi = Math.floor((sun - FL_ANCHOR) / (7 * 864e5));

  const feastDefrost = () => {
    const f = pick(SF, wi); const friFresh = /Shawarma/i.test(f.n);
    if (friFresh && dow === 5) return `🧊 Feast chicken out — ${f.n} cooks tonight`;
    if (!friFresh && dow === 4) return `🧊 Feast protein out — ${f.n} cooks tonight`;
    return null;
  };

  const items = [];
  if (MODE === 'morning') {
    (RM[dow] || []).forEach(([, txt]) => { if (/🧊|⚖️/.test(txt)) items.push({ title: clean(txt), body: '' }); });
    const fd = feastDefrost(); if (fd) items.push({ title: fd, body: '' });
  } else { // friday
    if (dow === 5) {
      const sat = cor(pick(CS, wi)[6][1]), sn = cor(pick(CS, wi + 1)[0][1]);
      items.push({ title: '🥣 Bring COR home for the weekend', body: `Sat: ${sat} · Sun: ${sn}` });
    }
    (RM[dow] || []).forEach(([, txt]) => { if (/🕯/.test(txt)) items.push({ title: clean(txt), body: '' }); });
  }

  if (!items.length) { console.log(`Nothing to send (MODE=${MODE}, dow=${dow}).`); return; }

  const gist = await (await fetch(`https://gist.githubusercontent.com/stbenun/${GIST_ID}/raw/thecut-data.json?cb=` + Date.now())).json();
  const rawSub = (gist.data || {})['qpcut.pushsub'];
  if (!rawSub) { console.log('No qpcut.pushsub in gist — reminders not enabled. Nothing to send.'); return; }
  const sub = JSON.parse(rawSub);

  webpush.setVapidDetails('mailto:noreply@thecut.app', VAPID_PUBLIC, VAPID_PRIVATE);
  let sent = 0;
  for (let i = 0; i < items.length; i++) {
    const payload = JSON.stringify({ title: items[i].title, body: items[i].body, url: 'https://stbenun.github.io/stevens-cut/', tag: `${MODE}-${i}` });
    try { await webpush.sendNotification(sub, payload); sent++; console.log('Sent:', items[i].title); }
    catch (e) {
      console.error('Push failed:', e.statusCode, e.body || e.message);
      if (e.statusCode === 404 || e.statusCode === 410) { console.log('Subscription gone — user must re-enable in the app.'); return; }
    }
  }
  console.log(`Done — ${sent}/${items.length} sent (MODE=${MODE}).`);
})();
