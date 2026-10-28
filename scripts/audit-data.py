"""Independent check of the built catalogue against the spreadsheet.

Reads data/source.xlsx with the Python standard library only (no exceljs, so it
shares no code with the build) and checks every part in src/generated/catalog.json:
GPN, description, lifecycle phase, part type, supplier part numbers and source rows.

    npm run audit:data
"""
import json, re, sys, zipfile, collections
import xml.etree.ElementTree as ET

XLSX, CATALOG = sys.argv[1], sys.argv[2]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
z = zipfile.ZipFile(XLSX)
shared = []
if 'xl/sharedStrings.xml' in z.namelist():
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
        shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
target = {r.get('Id'): r.get('Target') for r in rels}
sheets = {s.get('name'): 'xl/' + target[s.get('{%s}id' % NS['r'])].lstrip('/').replace('xl/', '') for s in wb.find('m:sheets', NS)}

def col(ref):
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n

def rows(name):
    root = ET.fromstring(z.read(sheets[name]))
    for r in root.iter('{%s}row' % NS['m']):
        cells = {}
        for c in r.findall('m:c', NS):
            t, v = c.get('t'), c.find('m:v', NS)
            if t == 's': val = shared[int(v.text)]
            elif t == 'inlineStr': val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
            else: val = v.text if v is not None else ''
            cells[col(c.get('r'))] = (val or '').strip()
        yield int(r.get('r')), cells

print('sheets:', list(sheets))
s1 = list(rows('Set 01')); s2 = list(rows('Set 02'))
print('Set 01 header:', [s1[0][1].get(i) for i in range(1, 6)])
print('Set 02 header:', [s2[0][1].get(i) for i in range(1, 8)])
print('Set 01 data rows:', len(s1) - 1, ' Set 02 data rows:', len(s2) - 1)

raw = collections.defaultdict(lambda: {'desc1': set(), 'desc2': set(), 'phase': set(), 'type': set(), 'mpn': set(), 'rows': set()})
for n, c in s1[1:]:
    g = c.get(1, '')
    if not g or g in ('GPN', 'Number'): continue
    raw[g]['desc1'].add(c.get(2, '')); raw[g]['type'].add(c.get(4, '')); raw[g]['rows'].add(('Set 01', n))
    raw[g]['phase1'] = c.get(3, '')
for n, c in s2[1:]:
    g = c.get(1, '')
    if not g: continue
    raw[g]['desc2'].add(c.get(3, '')); raw[g]['type'].add(c.get(2, '')); raw[g]['phase'].add(c.get(4, ''))
    if c.get(5) or c.get(6): raw[g]['mpn'].add((c.get(5, ''), c.get(6, '')))
    raw[g]['rows'].add(('Set 02', n))
print('distinct GPNs across both sheets:', len(raw))

cat = json.load(open(CATALOG))
problems = collections.Counter(); examples = collections.defaultdict(list)
def bad(kind, msg):
    problems[kind] += 1
    if len(examples[kind]) < 3: examples[kind].append(msg)

for p in cat['parts']:
    g = p['gpn']
    if g not in raw: bad('gpn missing from xlsx', g); continue
    r = raw[g]
    descs = r['desc2'] or r['desc1']
    if p['description'] not in descs: bad('description differs', f"{g}: {p['description']!r} vs {descs}")
    if len(r['desc2']) > 1: bad('GPN has several Set 02 descriptions', g)
    phases = r['phase'] or {r.get('phase1', '')}
    if p['phase'] not in phases: bad('phase differs', f"{g}: {p['phase']} vs {phases}")
    if p['partType'] not in r['type']: bad('part type differs', f"{g}: {p['partType']} vs {r['type']}")
    mine = {(s['name'], s['partNumber']) for s in p['suppliers']}
    if mine != r['mpn']: bad('suppliers differ', f"{g}: {mine ^ r['mpn']}")
    src = {(s['sheet'], s['row']) for s in p['sources']}
    if src != r['rows']: bad('source rows differ', f"{g}: {src ^ r['rows']}")

# Coverage: every GPN filed under a fastener part type should be in the catalogue.
in_cat = {p['gpn'] for p in cat['parts']}
fastener_typed = {g for g, r in raw.items() if any(t.lower().startswith('fastener') for t in r['type'])}
missing = sorted(fastener_typed - in_cat)
types = collections.Counter(t for g in missing for t in raw[g]['type'])
print('GPNs filed under a Fastener-* type:', len(fastener_typed), ' in catalogue:', len(fastener_typed & in_cat), ' left out:', len(missing))
print('  part types of those left out:', dict(types.most_common(8)))
for g in missing[:12]:
    print('   ', g, '|', next(iter(raw[g]['desc2'] or raw[g]['desc1'])))
print('catalogue parts not filed under a Fastener-* type (misfiled):', len(in_cat - fastener_typed), ' flagged misfiled in catalogue:', sum(p['misfiled'] for p in cat['parts']))

# Group integrity: every GPN in a group and in a physical part exists in the catalogue.
gp = {x for gr in cat['groups'] for x in gr['gpns']}
ph = [x for pp in cat['physical'] for x in pp['gpns']]
print('group GPNs not in catalogue:', len(gp - in_cat), ' physical-part GPNs:', len(ph), 'unique', len(set(ph)), ' = parts', len(in_cat))
print('health.inScope', cat['health']['inScope'], ' physical', cat['health']['physicalParts'])
print('\nPROBLEMS:', dict(problems) or 'none')
for k, v in examples.items():
    print(' ', k, v)
