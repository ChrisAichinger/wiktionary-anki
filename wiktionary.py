import re

from lxml import etree
from lxml.cssselect import CSSSelector
import requests

FORMS_TO_SHOW = [
    "Indicativemood##Present##Indef.",
    "Indicativemood##Present##Def.",
    "Indicativemood##Past##Indef.",
    "Indicativemood##Past##Def.",
]

def format_persons(arr):
    if not arr or len(arr) == 0:
        return ""
    if not arr[2]:  # Filter out forms that don't really exist
        return ""
    return f"{arr[0]}, {arr[1]}, {arr[2]}\n{arr[3]}, {arr[4]}, {arr[5]}"


def text_content(node):
    return ''.join(node.itertext())

def process_inflection(tbl):
    header_text = text_content(tbl.cssselect("th")[0])
    if not header_text.startswith("Inflection"):
        return

    m = {}
    for tr in tbl.cssselect('tr'):
        if len(tr) != 3:
            continue
        name, sg, pl = [text_content(el).strip() for el in tr]
        m[name] = [sg, pl]

    if "nominative" not in m:
        return None

    sg, pl = m["nominative"]
    result = f"{sg}, {pl}"
    print(result)
    return [result]
    return m

def array_from_html_table(tbl):
    rowspans = []
    cells = []
    for tr in tbl.cssselect('tr'):
        row = []
        cells.append(row)
        for td in tr:
            while len(rowspans) > len(row) and rowspans[len(row)]:
                row.append(rowspans[len(row)].pop())
            colspan = int(td.get('colspan', "1"))
            rowspan = int(td.get('rowspan', "1"))
            text = text_content(td).strip().replace('\n', ' ').replace('\xad', '').replace('\xa0', ' ')
            if len(rowspans) <= len(row):
                rowspans.append([])
            for _ in range(1, rowspan):
                rowspans[len(row)].append(text)
            row.append(text)
            for _ in range(1, colspan):
                row.append("")
    return cells


def process_conjugation(frm):
    #print("processing_conjugation", frm)
    nav_head = text_content(frm.cssselect('.NavHead')[0])
    if not nav_head.startswith("conjugation"):
        return

    print("processing_conjugation2", frm)
    tbl = frm.cssselect('.NavContent > table')[0]
    cells = array_from_html_table(tbl)
    m = {}

    for row in cells:
        key = '##'.join(row[:3]).replace("[^a-zA-Z#.0-9]", "")
        m[key] = row[3:]

    #print("yyy", cells)
    #print("zzz", m)
    infinitive = next((row[1] for row in cells if row and row[0] == 'Infinitive'), None)
    stem = m.get("Indicativemood##Present##Indef.", [None, None, None])[2]
    result_list = [f"{stem}, {infinitive}"]

    for key in FORMS_TO_SHOW:
        result_list.append(format_persons(m.get(key)))

    result = "\n\n".join(result_list)

    print(result)
    return result_list


def load_forms(word):
    r = requests.get(f'https://en.wiktionary.org/api/rest_v1/page/html/{word}')
    r.raise_for_status()
    text = r.text
    root = etree.fromstring(text)

    hu_headline = root.cssselect('#Hungarian')
    if not hu_headline:
        raise RuntimeError("Hungarian not found")
    hu_headline = hu_headline[0]
    hu_section = hu_headline.getparent()
    assert hu_section.tag == 'section'

    result = []
    for sec in hu_section.findall('./section'):
        headings = set(sec.xpath('(.//h3 | .//h4)/text()'))
        for inflection_table in sec.cssselect(".inflection-table"):
            data = process_inflection(inflection_table)
            if data:
                result.append({"t": "inflection", "h": headings, "data": data})

        for conjugation_frame in sec.cssselect("div.NavFrame"):
            data = process_conjugation(conjugation_frame)
            if data:
                result.append({"t": "conjugation", "h": headings, "data": data})
    return result


def load_definition(word):
    r = requests.get(f"https://en.wiktionary.org/api/rest_v1/page/definition/{word}")
    r.raise_for_status()
    js = r.json()
    assert 'hu' in js

    result = {}
    for entry in js['hu']:
        key = entry.get('partOfSpeech', '')
        defs = [strip_tags(d['definition']).strip() for d in entry['definitions']]
        value = '\n'.join(d for d in defs if d)
        result.setdefault(key, []).append(value)
    return result


def strip_tags(text):
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)



def load_wiktionary(word):
    forms = load_forms(word)
    defns = load_definition(word)
    return {
        k: {"defn": v, "forms": [f for f in forms if k in f['h']]}
        for k, v in defns.items()
    }
