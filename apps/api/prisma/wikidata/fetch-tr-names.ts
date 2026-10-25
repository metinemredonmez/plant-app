/**
 * Turkish names for the species in species-list.txt, from Wikidata labels
 * (CC0 1.0). Writes tr-names.json next to this file; the seed loads it into
 * `plant_names`. Run: pnpm --filter @everbloom/api species:names
 *
 * A label only counts as a Turkish name when it is not Latin: many Turkish
 * labels just copy the scientific name or the genus.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scientificKey } from '../../src/care/scientific-name.js';

const here = dirname(fileURLToPath(import.meta.url));
const ENDPOINT = 'https://query.wikidata.org/sparql';
// Wikimedia asks for a descriptive User-Agent with a way to reach us.
const USER_AGENT =
  'EverBloomSpeciesNames/0.1 (https://github.com/metinemredonmez/plant-app)';
const BATCH = 80;

export interface NameEntry {
  scientificName: string;
  wikidataId: string | null;
  turkishName: string | null;
  otherNames: string[];
  gbifId: string | null;
  powoId: string | null;
}

interface Binding {
  item: { value: string };
  name: { value: string };
  tr?: { value: string };
  alts?: { value: string };
  gbif?: { value: string };
  powo?: { value: string };
  links: { value: string };
}

const query = (names: string[]) => `
SELECT ?item ?name ?links (SAMPLE(?label) AS ?tr) (SAMPLE(?gbifId) AS ?gbif)
       (SAMPLE(?powoId) AS ?powo) (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts)
WHERE {
  VALUES ?name { ${names.map((name) => JSON.stringify(name)).join(' ')} }
  ?item wdt:P225 ?name ; wikibase:sitelinks ?links .
  OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label) = "tr") }
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(LANG(?alt) = "tr") }
  OPTIONAL { ?item wdt:P846 ?gbifId }
  OPTIONAL { ?item wdt:P5037 ?powoId }
}
GROUP BY ?item ?name ?links`;

async function lookup(names: string[]): Promise<Binding[]> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ query: query(names) }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(
      `Wikidata HTTP ${response.status}: ${await response.text()}`,
    );
  }
  const body = (await response.json()) as {
    results: { bindings: Binding[] };
  };
  return body.results.bindings;
}

const capitalize = (label: string) =>
  label.charAt(0).toLocaleUpperCase('tr') + label.slice(1);

/** Genera of the list, filled in main(): "Mespilus japonica" is no alias. */
const genera = new Set<string>();

/**
 * A Turkish label, unless it is Latin: it starts with a genus of the list
 * (the scientific name itself, a synonym), repeats the epithet, or is a
 * half-Latin "Krizantem × morifolium".
 */
function turkish(label: string | undefined, scientificName: string) {
  const value = label?.trim();
  if (!value || value.includes('×')) return null;
  const [first, second] = scientificKey(value).split(' ');
  const epithet = scientificKey(scientificName).split(' ')[1];
  // Also a misspelled genus with the same epithet ("Lagerstromia indica").
  const latin = genera.has(first) || (!!second && second === epithet);
  return latin ? null : capitalize(value);
}

/** Hybrid spellings Wikidata uses: "Mentha ×piperita", "Iris × germanica". */
function hybridSpellings(name: string) {
  const [genus, ...rest] = name.split(' ');
  const epithet = rest.join(' ').replace(/^×\s*/, '');
  return [
    `${genus} ×${epithet}`,
    `${genus} × ${epithet}`,
    `${genus} ${epithet}`,
  ].filter((spelling) => spelling !== name);
}

function entry(
  scientificName: string,
  bindings: Binding[],
  spellings = [scientificName],
): NameEntry {
  // Homonyms: prefer the plant (POWO or GBIF id), then the better known item.
  const [best] = bindings
    .filter((b) => spellings.includes(b.name.value))
    .sort(
      (a, b) =>
        Number(!!b.powo) - Number(!!a.powo) ||
        Number(!!b.gbif) - Number(!!a.gbif) ||
        Number(b.links.value) - Number(a.links.value),
    );
  if (!best) {
    return {
      scientificName,
      wikidataId: null,
      turkishName: null,
      otherNames: [],
      gbifId: null,
      powoId: null,
    };
  }
  const aliases = (best.alts?.value ?? '')
    .split('|')
    .map((alt) => turkish(alt, scientificName))
    .filter((alt): alt is string => !!alt);
  // A Latin label with a Turkish alias: "Iris", also "Süsen".
  const turkishName =
    turkish(best.tr?.value, scientificName) ?? aliases[0] ?? null;
  return {
    scientificName,
    wikidataId: best.item.value.split('/').pop()!,
    turkishName,
    otherNames: [...new Set(aliases)].filter((alt) => alt !== turkishName),
    gbifId: best.gbif?.value ?? null,
    powoId: best.powo?.value ?? null,
  };
}

async function main() {
  const names = [
    ...new Set(
      (await readFile(join(here, 'species-list.txt'), 'utf8'))
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')),
    ),
  ];
  for (const name of names) genera.add(scientificKey(name).split(' ')[0]);
  const species: NameEntry[] = [];
  for (let i = 0; i < names.length; i += BATCH) {
    const batch = names.slice(i, i + BATCH);
    const bindings = await lookup(batch);
    species.push(...batch.map((name) => entry(name, bindings)));
    console.log(`${Math.min(i + BATCH, names.length)}/${names.length}`);
  }
  // Second pass for hybrids written another way on Wikidata.
  const unmatched = species.filter((s) => !s.wikidataId);
  const spellings = unmatched.flatMap((s) => hybridSpellings(s.scientificName));
  const bindings =
    spellings.length > 0 ? await lookup([...new Set(spellings)]) : [];
  for (const missing of unmatched) {
    const found = entry(missing.scientificName, bindings, [
      missing.scientificName,
      ...hybridSpellings(missing.scientificName),
    ]);
    species[species.indexOf(missing)] = found;
  }

  const found = species.filter((s) => s.wikidataId).length;
  const named = species.filter((s) => s.turkishName).length;
  await writeFile(
    join(here, 'tr-names.json'),
    `${JSON.stringify(
      {
        source: 'Wikidata (P225 taxon name, Turkish labels and aliases)',
        license: 'CC0 1.0',
        fetchedAt: new Date().toISOString().slice(0, 10),
        total: species.length,
        onWikidata: found,
        withTurkishName: named,
        species,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `${found}/${species.length} on Wikidata, ${named} with a Turkish name (${Math.round((named / species.length) * 100)}%)`,
  );
  const missing = species
    .filter((s) => !s.wikidataId)
    .map((s) => s.scientificName);
  if (missing.length) console.log(`Not on Wikidata: ${missing.join(', ')}`);
}

await main();
