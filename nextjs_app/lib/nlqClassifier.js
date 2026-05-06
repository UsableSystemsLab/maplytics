import bag from "./nlqBagOfWords.json";

const VERBS = new Set(bag.verbs.map((v) => v.toLowerCase()));

function tokenize(query) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function findMatchedTerms(tokens, terms) {
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  const tokenSet = new Set(tokens);
  const matched = [];
  for (const term of sortedTerms) {
    const lower = term.toLowerCase();
    if (lower.includes(" ")) {
      const phrase = lower.split(/\s+/);
      for (let i = 0; i <= tokens.length - phrase.length; i++) {
        if (phrase.every((p, j) => tokens[i + j] === p)) {
          matched.push(term);
          break;
        }
      }
    } else if (tokenSet.has(lower)) {
      matched.push(term);
    }
  }
  return matched;
}

export function classify(query) {
  if (!query || typeof query !== "string" || !query.trim()) {
    return { ok: false, reason: "empty" };
  }

  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const firstToken = tokens[0];
  if (!VERBS.has(firstToken)) {
    return { ok: false, reason: "not_a_verb", firstWord: firstToken };
  }

  for (const [type, def] of Object.entries(bag.types)) {
    const matched = findMatchedTerms(tokens, def.terms);
    if (matched.length > 0) {
      return {
        ok: true,
        type,
        verb: firstToken,
        matchedTerms: matched,
        label: def.label,
        color: def.color,
      };
    }
  }

  return { ok: false, reason: "no_type_terms", verb: firstToken };
}

export const bagOfWords = bag;
