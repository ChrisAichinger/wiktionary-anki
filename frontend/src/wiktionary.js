const FORMS_TO_SHOW = [
    "Indicativemood##Present##Indef.",
    "Indicativemood##Present##Def.",
    "Indicativemood##Past##Indef.",
    "Indicativemood##Past##Def.",
];

function formatPersons(arr) {
    if (!arr || arr.length === 0) {
        return "";
    }
    if (!arr[2]) {  // Filter out forms that don't really exist
        return "";
    }
    return `${arr[0]}, ${arr[1]}, ${arr[2]}\n${arr[3]}, ${arr[4]}, ${arr[5]}`;
}

function textContent(node) {
    return node.textContent;
}

function processInflection(tbl) {
    const headerText = textContent(tbl.querySelector("th"));
    if (!headerText.startsWith("Inflection")) {
        return;
    }

    const m = {};
    tbl.querySelectorAll('tr').forEach(tr => {
        if (tr.children.length !== 3) {
            return;
        }
        const [name, sg, pl] = Array.from(tr.children).map(el => textContent(el).trim());
        m[name] = [sg, pl];
    });

    if (!m["nominative"]) {
        return null;
    }

    const [sg, pl] = m["nominative"];
    const result = `${sg}, ${pl}`;
    console.log(result);
    return [result];
}

function arrayFromHtmlTable(tbl) {
    const rowspans = [];
    const cells = [];
    for (let tr of tbl.querySelectorAll('tr')) {
        const row = [];
        cells.push(row);
        for (const td of tr.children) {
            while (rowspans[row.length]?.length) {
                row.push(rowspans[row.length].pop());
            }
            const colspan = parseInt(td.getAttribute('colspan') || "1");
            const rowspan = parseInt(td.getAttribute('rowspan') || "1");
            const text = td.innerText.trim().replaceAll('\n', ' ');
            rowspans[row.length] ??= [];
            for (let i=1; i < rowspan; i++) {
                rowspans[row.length].push(text);
            }
            row.push(text);
            for (let i=1; i < colspan; i++) { row.push(""); }
        }
    }
    return cells;
}

function processConjugation(frm) {
    const navHead = textContent(frm.querySelector('.NavHead'));
    if (!navHead.startsWith("conjugation")) {
        return;
    }

    console.log("processing_conjugation2", frm);
    const tbl = frm.querySelector('.NavContent > table');
    const cells = arrayFromHtmlTable(tbl);
    const m = {};

    cells.forEach(row => {
        const key = row.slice(0, 3).join('##').replace(/[^a-zA-Z#.0-9]/g, "");
        m[key] = row.slice(3);
    });

    const infinitive = cells.find(row => row && row[0] === 'Infinitive')?.[1];
    const stem = m["Indicativemood##Present##Indef."]?.[2];
    const resultList = [`${stem}, ${infinitive}`];

    FORMS_TO_SHOW.forEach(key => {
        resultList.push(formatPersons(m[key]));
    });

    const result = resultList.join("\n\n");

    console.log(result);
    return resultList;
}

async function loadForms(word) {
    const response = await fetch(`https://en.wiktionary.org/api/rest_v1/page/html/${word}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    const huHeadline = doc.querySelector('#Hungarian');
    if (!huHeadline) {
        throw new Error("Hungarian not found");
    }
    const huSection = huHeadline.parentElement;
    if (huSection.tagName !== 'SECTION') {
        throw new Error("Unexpected section tag");
    }

    const result = [];
    huSection.querySelectorAll('section').forEach(sec => {
        const headings = new Set(Array.from(sec.querySelectorAll('h3, h4')).map(h => h.textContent));
        sec.querySelectorAll(".inflection-table").forEach(inflectionTable => {
            const data = processInflection(inflectionTable);
            if (data) {
                result.push({ t: "inflection", h: headings, data });
            }
        });

        sec.querySelectorAll("div.NavFrame").forEach(conjugationFrame => {
            const data = processConjugation(conjugationFrame);
            if (data) {
                result.push({ t: "conjugation", h: headings, data });
            }
        });
    });
    return result;
}

async function loadDefinition(word) {
    const response = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${word}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const js = await response.json();
    if (!js.hu) {
        throw new Error("Hungarian not found in response");
    }

    const result = {};
    js.hu.forEach(entry => {
        const key = entry.partOfSpeech || '';
        const defs = entry.definitions.map(d => stripTags(d.definition).trim());
        const value = defs.filter(d => d).join('\n');
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(value);
    });
    return result;
}

function stripTags(text) {
    const clean = /<.*?>/g;
    return text.replace(clean, '');
}

export default async function loadWiktionary(word) {
    const forms = await loadForms(word);
    const defns = await loadDefinition(word);
    return Object.fromEntries(Object.entries(defns).map(([k, v]) => [
        k, { defn: v, forms: forms.filter(f => f.h.has(k)) }
    ]));
}
