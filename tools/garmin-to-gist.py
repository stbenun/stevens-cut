#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""garmin-to-gist.py — ingest his Garmin CSV exports into the live sync gist.

He sends the exports in chat; the app only READS these keys. The on-device paste box and parser
were deleted Aug 3 2026 at his request, so this is the only ingest path. It lived in a scratchpad,
died with that session, and had to be rebuilt from memory — hence: it lives in the repo now.

WHAT IT WRITES (shapes matter — the app throws on a wrong one, and a throw takes the whole tab):
  qpcut.hrv.<dkey>   the 7-DAY AVERAGE, never the overnight value. dkey is UNPADDED: 2026-8-3
  qpcut.hrvbase      the LOW end of Garmin's baseline range
  qpcut.weights      array of {d,w,s,sl}: s = steps in THOUSANDS (1 dp), sl = hours slept (decimal)
  qpcut.garmin       {"rhr": {iso: bpm}, "last": iso}
Every value in the gist payload is a JSON *string*, so everything is encoded twice.
Each key written gets w[key] = now(ms) so this copy wins the newest-stamp merge on his phone.

RULES BAKED IN, each one learned the hard way:
  - Garmin exports NEWEST ROW FIRST. Sort before trusting "the latest".
  - Steps: fill only days he left BLANK. His own number always wins.
  - SKIP THE PARTIAL CURRENT DAY for steps and calories — 5,301 steps at 3 PM is not a real day.
    Sleep and HRV for today ARE complete (that night is over) and do get written.
  - Back the payload up before PATCHing, and re-read the gist fresh first.

Usage:
  python tools/garmin-to-gist.py --dir .work/garmin [--today 2026-08-07] [--dry-run]
"""
import argparse, csv, io, json, os, re, subprocess, sys, time, glob

GIST = 'cdea638da31299a8b1bdc25d0aeb3e98'
RAW  = 'https://gist.githubusercontent.com/stbenun/%s/raw/thecut-data.json' % GIST


def dkey(iso):
    y, m, d = iso.split('-')
    return '%d-%d-%d' % (int(y), int(m), int(d))


def read_csv(path):
    with io.open(path, encoding='utf-8-sig') as fh:
        return list(csv.DictReader(fh))


def parse_dur(s):
    """'6h 23min' -> 6.383 decimal hours"""
    h = re.search(r'(\d+)\s*h', s or '')
    m = re.search(r'(\d+)\s*min', s or '')
    if not h and not m:
        return None
    return round((int(h.group(1)) if h else 0) + (int(m.group(1)) if m else 0) / 60.0, 3)


def parse_mdy(s):
    """'08/04/2026' -> '2026-08-04'"""
    m = re.match(r'(\d{2})/(\d{2})/(\d{4})', (s or '').strip())
    return '%s-%s-%s' % (m.group(3), m.group(1), m.group(2)) if m else None


def parse_hrv_date(s, year):
    """'Aug 4' -> '2026-08-04'"""
    MON = dict(Jan=1, Feb=2, Mar=3, Apr=4, May=5, Jun=6,
               Jul=7, Aug=8, Sep=9, Oct=10, Nov=11, Dec=12)
    m = re.match(r'([A-Za-z]{3})\s+(\d{1,2})', (s or '').strip())
    if not m or m.group(1) not in MON:
        return None
    return '%d-%02d-%02d' % (year, MON[m.group(1)], int(m.group(2)))


def num(s):
    m = re.search(r'-?\d+(?:\.\d+)?', str(s or ''))
    return float(m.group(0)) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default='.work/garmin')
    ap.add_argument('--today', default=time.strftime('%Y-%m-%d'))
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    today = a.today
    year = int(today[:4])

    def find(pat):
        hits = sorted(glob.glob(os.path.join(a.dir, pat)))
        return hits[0] if hits else None

    f_sleep = find('Sleep*.csv')
    f_hrv   = find('HRV*.csv')
    f_steps = find('Steps*.csv')
    f_cal   = find('Calories*.csv')

    sleep = {}   # iso -> (hours, rhr)
    if f_sleep:
        for r in read_csv(f_sleep):
            iso = (r.get('Sleep Score 7 Days') or '').strip()
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', iso):
                continue
            sleep[iso] = (parse_dur(r.get('Duration')), num(r.get('Resting Heart Rate')))

    hrv = {}     # iso -> (avg7, base_low)
    if f_hrv:
        for r in read_csv(f_hrv):
            iso = parse_hrv_date(r.get('Date'), year)
            if not iso:
                continue
            base = r.get('Baseline') or ''
            lo = num(base.split('-')[0]) if '-' in base else None
            hrv[iso] = (num(r.get('7d Avg')), lo)

    steps = {}   # iso -> raw count
    if f_steps:
        for r in read_csv(f_steps):
            iso = parse_mdy(list(r.values())[0])
            if iso:
                steps[iso] = num(r.get('Actual'))

    cals = {}
    if f_cal:
        for r in read_csv(f_cal):
            iso = parse_mdy(list(r.values())[0])
            if iso:
                cals[iso] = (num(r.get('Active Calories')), num(r.get('Total')))

    # ---- pull the gist FRESH; never write over a stale read ----
    payload = json.loads(subprocess.check_output(
        ['curl', '-s', RAW]).decode('utf-8'))
    data, wmap = payload['data'], payload.setdefault('w', {})
    os.makedirs('.work', exist_ok=True)
    with io.open('.work/gist-backup-%d.json' % int(time.time()), 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(payload))

    now = int(time.time() * 1000)
    touched, notes = [], []

    def put(key, value):
        data[key] = json.dumps(value, separators=(',', ':')) if not isinstance(value, str) else value
        wmap[key] = now
        touched.append(key)

    # ---- HRV 7-day average + baseline floor ----
    for iso in sorted(hrv):
        avg, lo = hrv[iso]
        if avg is not None:
            put('qpcut.hrv.' + dkey(iso), avg)
    latest = sorted(hrv)[-1] if hrv else None
    if latest and hrv[latest][1] is not None:
        old = data.get('qpcut.hrvbase')
        put('qpcut.hrvbase', hrv[latest][1])
        if old is not None and json.loads(old) != hrv[latest][1]:
            notes.append('baseline floor %s -> %s' % (json.loads(old), hrv[latest][1]))

    # ---- weights[]: sleep + steps ----
    weights = json.loads(data.get('qpcut.weights', '[]'))
    byd = {r['d']: r for r in weights}
    for iso in sorted(set(list(sleep) + list(steps))):
        row = byd.get(iso)
        if row is None:
            row = {'d': iso, 'w': None, 's': None, 'sl': None}
            weights.append(row)
            byd[iso] = row
        if iso in sleep and sleep[iso][0] is not None and row.get('sl') in (None, ''):
            row['sl'] = sleep[iso][0]
        if iso in steps and steps[iso] is not None:
            if iso == today:
                notes.append('steps for %s skipped — partial day (%d so far)' % (iso, steps[iso]))
            elif row.get('s') in (None, ''):
                row['s'] = round(steps[iso] / 1000.0, 1)
            elif abs(row['s'] - steps[iso] / 1000.0) > 0.6:
                notes.append('steps %s: his %.1fk vs Garmin %.1fk — KEPT HIS' %
                             (iso, row['s'], steps[iso] / 1000.0))
    weights.sort(key=lambda r: r['d'])
    put('qpcut.weights', weights)

    # ---- resting HR ----
    g = json.loads(data.get('qpcut.garmin', '{"rhr":{},"last":null}'))
    g.setdefault('rhr', {})
    for iso in sorted(sleep):
        if sleep[iso][1] is not None:
            g['rhr'][iso] = int(sleep[iso][1])
    if sleep:
        g['last'] = sorted(sleep)[-1]
    put('qpcut.garmin', g)

    print('files: %s' % ', '.join(os.path.basename(x) for x in [f_sleep, f_hrv, f_steps, f_cal] if x))
    print('keys to write (%d): %s' % (len(touched), ', '.join(sorted(set(touched))[:6]) +
                                      (' ...' if len(set(touched)) > 6 else '')))
    for n in notes:
        print('  note: ' + n)
    print('\nweights tail:')
    for r in weights[-8:]:
        print('   %s  w=%-6s s=%-6s sl=%s' % (r['d'], r.get('w'), r.get('s'), r.get('sl')))

    if a.dry_run:
        print('\n--dry-run: nothing written')
        return

    payload['at'] = now
    body = json.dumps({'files': {'thecut-data.json': {'content': json.dumps(payload)}}})
    with io.open('.work/patch.json', 'w', encoding='utf-8') as fh:
        fh.write(body)
    subprocess.check_call(['gh', 'api', '-X', 'PATCH', 'gists/' + GIST,
                           '--input', '.work/patch.json'], stdout=subprocess.DEVNULL)
    print('\nwritten to the gist — his phone picks it up on next open/sync')


if __name__ == '__main__':
    main()
