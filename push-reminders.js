/* Weekly/daily reminder push sender (GitHub Action).
   Reads ALL reminder sources from the LIVE app (single source of truth) + the push subscription from the
   secret gist, and sends the ones due for the current run:
     MODE=morning : today's 🧊 defrost + ⚖️ weigh-in + any EVENT he told me about (fires ~6 AM ET, daily)
     MODE=friday  : 🥣 COR flavors + 🕯 Shabbat prep (fires ~3 PM ET, Fridays)
   The rotation logic (feast defrost, COR flavors) mirrors the app; the data comes from the app so it stays
   in sync. Two DST-shifted crons feed each mode; an ET-hour gate makes exactly one fire.
   `--list` prints the extracted events off the local file and exits — no keys, no network. */
/* web-push is required LAZILY: it is only installed in the Action, so a top-level require made every
   local invocation (including --list, which needs nothing) die with MODULE_NOT_FOUND. */
let webpush = null;
const loadWebPush = () => (webpush || (webpush = require('web-push')));

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
/* Events he has told me about, for the morning-of reminder. His rule, Aug 17 2026: when he names an
   event, all it gets is a schedule row and a morning reminder — no meal coaching, no adjustments.
   ⚠️ Extracted by REGEX, deliberately NOT through grab()/eval(): every EVENTS entry carries a template
   literal card body, and one entry that failed to eval would throw here and take his defrost and
   weigh-in pushes down with it. This only ever reads the entry HEAD (up to `msg:`), which is plain
   quoted fields, so a card body can never break the reminder.
   `row` is preferred over `title` because it already carries the time. */
function grabEvents(html) {
  const start = html.indexOf('const EVENTS = [');
  if (start < 0) return [];
  const end = html.indexOf('\nconst ', start + 1);
  const blk = html.slice(start, end < 0 ? undefined : end);
  const out = [];
  const head = /\{d:'(\d{4}-\d{2}-\d{2})'([\s\S]*?)msg:/g;
  let m;
  while ((m = head.exec(blk))) {
    const h = m[2];
    const at = /at:'(\d{1,2}:\d{2})'/.exec(h);
    const row = /row:'([^']*)'/.exec(h);
    const title = /title:'((?:[^'\\]|\\.)*)'/.exec(h);
    const label = (row && row[1]) || (title && title[1]) || null;
    if (label) out.push({ d: m[1], at: at ? at[1] : null, label });
  }
  return out;
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

/* The notifications a given (html, date, mode) should produce. Pulled out of the async main so a test
   can drive the REAL composition instead of a copy of it: an earlier version of [event-push] exercised
   grabEvents() alone and happily passed while the morning branch had been gutted to send nothing. */
function buildItems(html, et, mode) {
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
  if (mode === 'morning') {
    (RM[dow] || []).forEach(([, txt]) => { if (/🧊|⚖️/.test(txt)) items.push({ title: clean(txt), body: '' }); });
    const fd = feastDefrost(); if (fd) items.push({ title: fd, body: '' });
    /* today's events — the reminder half of "a sched adjustment and a reminder for the morning of" */
    const iso = `${et.y}-${String(et.mo).padStart(2, '0')}-${String(et.d).padStart(2, '0')}`;
    grabEvents(html).filter(e => e.d === iso)
      .forEach(e => items.push({ title: clean(e.label), body: 'Today' }));
  } else { // friday
    if (dow === 5) {
      const sat = cor(pick(CS, wi)[6][1]), sn = cor(pick(CS, wi + 1)[0][1]);
      items.push({ title: '🥣 Bring COR home for the weekend', body: `Sat: ${sat} · Sun: ${sn}` });
    }
    (RM[dow] || []).forEach(([, txt]) => { if (/🕯/.test(txt)) items.push({ title: clean(txt), body: '' }); });
  }
  return items;
}

(async () => {
  /* Two offline modes, both off the LOCAL file with no keys and no network — this is what [event-push]
     in check-app.js drives, so neither the extractor regex nor the morning branch can quietly stop
     working and end his reminders:
       --list                  what the event extractor sees
       --dry <mode> <ISO date> the notifications that date would actually send  */
  if (process.argv.includes('--list') || process.argv.includes('--dry')) {
    const local = require('fs').readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
    if (process.argv.includes('--list')) { console.log(JSON.stringify(grabEvents(local), null, 1)); return; }
    const i = process.argv.indexOf('--dry');
    const mode = process.argv[i + 1] || 'morning';
    const iso = process.argv[i + 2];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) { console.error('--dry needs <mode> <YYYY-MM-DD>'); process.exit(2); }
    const [y, mo, d] = iso.split('-').map(Number);
    const et = { y, mo, d, hour: 6, dow: new Date(y, mo - 1, d, 12).getDay() };
    console.log(JSON.stringify(buildItems(local, et, mode), null, 1));
    return;
  }
  if (!VAPID_PRIVATE || !GIST_ID) { console.error('Missing VAPID_PRIVATE_KEY or GIST_ID'); process.exit(1); }
  // GitHub's scheduler delays cron runs by hours, so gate on a WINDOW (not an exact hour) — a run that
  // lands anywhere in the window still fires. One cron per mode means no double-send.
  const et = etNow();
  const inWindow = MODE === 'friday' ? (et.hour >= 13 && et.hour < 21) : (et.hour >= 4 && et.hour < 12);
  if (!FORCE && !inWindow) { console.log(`ET hour ${et.hour} outside the ${MODE} window — skipping.`); return; }

  const html = await (await fetch('https://stbenun.github.io/stevens-cut/index.html?cb=' + Date.now())).text();
  /* ONE composition, shared with --dry. It used to be inlined here, which meant a test could only ever
     check a copy of the logic rather than the logic. */
  const items = buildItems(html, et, MODE);

  if (!items.length) { console.log(`Nothing to send (MODE=${MODE}, dow=${et.dow}).`); return; }

  const gist = await (await fetch(`https://gist.githubusercontent.com/stbenun/${GIST_ID}/raw/thecut-data.json?cb=` + Date.now())).json();
  const rawSub = (gist.data || {})['qpcut.pushsub'];
  if (!rawSub) { console.log('No qpcut.pushsub in gist — reminders not enabled. Nothing to send.'); return; }
  const sub = JSON.parse(rawSub);

  loadWebPush().setVapidDetails('mailto:noreply@thecut.app', VAPID_PUBLIC, VAPID_PRIVATE);
  let sent = 0;
  for (let i = 0; i < items.length; i++) {
    const payload = JSON.stringify({ title: items[i].title, body: items[i].body, url: 'https://stbenun.github.io/stevens-cut/', tag: `${MODE}-${i}` });
    try { await loadWebPush().sendNotification(sub, payload); sent++; console.log('Sent:', items[i].title); }
    catch (e) {
      console.error('Push failed:', e.statusCode, e.body || e.message);
      if (e.statusCode === 404 || e.statusCode === 410) { console.log('Subscription gone — user must re-enable in the app.'); return; }
    }
  }
  console.log(`Done — ${sent}/${items.length} sent (MODE=${MODE}).`);
})();
