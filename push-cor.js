/* Weekly COR push sender (GitHub Action). Reads flavors from the LIVE app (single source of truth) and the
   push subscription from the secret gist (ID via env secret). Sends a Web Push for the upcoming weekend. */
const webpush = require('web-push');

const VAPID_PUBLIC = 'BBFdK2pympLwLgo4LwVVpkz1g9KOfRFQ9611TQOt7xYbNRHprxyz0ALB582eBsY8jo1E9-_e_f5Wvnzi4eFVXBg';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const GIST_ID = process.env.GIST_ID;
const FORCE = process.env.FORCE === '1' || process.argv.includes('--force');
const FL_ANCHOR = new Date(2026, 5, 28); // must mirror the app's FL_ANCHOR

(async () => {
  if (!VAPID_PRIVATE || !GIST_ID) { console.error('Missing VAPID_PRIVATE_KEY or GIST_ID secret'); process.exit(1); }

  // Two cron entries fire (19:05 & 20:05 UTC Fri) to cover DST; only the one landing at 3 PM ET actually sends.
  const etHour = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date());
  if (!FORCE && etHour !== 15) { console.log(`ET hour is ${etHour}, not 15 — skipping this run.`); return; }

  // --- flavors from the live app ---
  const html = await (await fetch('https://stbenun.github.io/stevens-cut/index.html?cb=' + Date.now())).text();
  const s = html.indexOf('const COR_SETS = [');
  const CS = eval('(' + html.slice(s + 'const COR_SETS = '.length, html.indexOf('];', s) + 1) + ')');
  const pick = i => CS[((i % CS.length) + CS.length) % CS.length];
  const cor = spec => spec.split(' COR')[0].trim().replace(/&amp;/g, '&');
  const [M, D, Y] = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date()).split('/').map(Number);
  const et = new Date(Y, M - 1, D, 12, 0, 0);
  const sun = new Date(et); sun.setDate(et.getDate() - et.getDay()); sun.setHours(12, 0, 0, 0);
  const wi = Math.floor((sun - FL_ANCHOR) / (7 * 864e5));
  const sat = cor(pick(wi)[6][1]);
  const sunF = cor(pick(wi + 1)[0][1]);

  // --- subscription from the secret gist ---
  const gistUrl = `https://gist.githubusercontent.com/stbenun/${GIST_ID}/raw/thecut-data.json?cb=` + Date.now();
  const gist = await (await fetch(gistUrl)).json();
  const raw = (gist.data || {})['qpcut.pushsub'];
  if (!raw) { console.log('No qpcut.pushsub in the gist yet — user has not enabled reminders. Nothing to send.'); return; }
  const sub = JSON.parse(raw);

  webpush.setVapidDetails('mailto:noreply@thecut.app', VAPID_PUBLIC, VAPID_PRIVATE);
  const payload = JSON.stringify({
    title: '🥣 Bring COR home for the weekend',
    body: `Sat: ${sat} · Sun: ${sunF} — grab from the office before Shabbat (no shopping Sat).`,
    url: 'https://stbenun.github.io/stevens-cut/',
    tag: 'cor-weekend'
  });

  try {
    await webpush.sendNotification(sub, payload);
    console.log(`Push sent — Sat: ${sat} · Sun: ${sunF}`);
  } catch (e) {
    console.error('Push failed:', e.statusCode, e.body || e.message);
    if (e.statusCode === 404 || e.statusCode === 410) {
      console.log('Subscription is gone (expired/unsubscribed) — user must re-enable reminders in the app.');
      return; // not a workflow failure
    }
    process.exit(1);
  }
})();
