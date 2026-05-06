import { distance } from 'fastest-levenshtein';

const NOISE_TOKENS = new Set(['al', 'district', 'dist']);
const FUZZY_THRESHOLD = 2;

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function cleanedTokens(text) {
  return tokens(text).filter((t) => !NOISE_TOKENS.has(t));
}

export function normalizeDistrict(name) {
  return cleanedTokens(name).join(' ').trim();
}

export function matchTwoDistricts(query, districts) {
  const aliases = districts
    .map((d) => ({
      district_id: d.district_id,
      name_en: d.name_en,
      norm: normalizeDistrict(d.name_en),
    }))
    .filter((a) => a.norm.length > 0);

  // Longer aliases first so e.g. "north olaya" wins over "olaya".
  aliases.sort((a, b) => b.norm.length - a.norm.length);

  const queryNorm = ' ' + cleanedTokens(query).join(' ') + ' ';

  const found = [];
  const seen = new Set();

  for (const alias of aliases) {
    if (seen.has(alias.district_id)) continue;
    const target = ' ' + alias.norm + ' ';
    const idx = queryNorm.indexOf(target);
    if (idx !== -1) {
      found.push({ ...alias, position: idx });
      seen.add(alias.district_id);
    }
  }

  if (found.length < 2) {
    const remaining = aliases.filter((a) => !seen.has(a.district_id));
    const queryClean = cleanedTokens(query);
    for (const t of queryClean) {
      for (const alias of remaining) {
        if (seen.has(alias.district_id)) continue;
        if (distance(t, alias.norm) <= FUZZY_THRESHOLD) {
          found.push({
            ...alias,
            position: queryNorm.indexOf(' ' + t + ' '),
          });
          seen.add(alias.district_id);
        }
      }
    }
  }

  if (found.length < 2) {
    return { ok: false, reason: 'too_few', matches: found };
  }

  found.sort((a, b) => a.position - b.position);
  return { ok: true, matches: found.slice(0, 2) };
}
