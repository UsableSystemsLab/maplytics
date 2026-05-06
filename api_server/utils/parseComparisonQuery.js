const ATTR_RE = /\b(?:by|based on|on)\s+([\p{L}\p{N}\s_-]+?)\s*[.?!]?$/iu;

export function parseAttributeToken(query) {
  if (!query) return null;
  const match = String(query).match(ATTR_RE);
  if (!match) return null;
  const token = match[1].trim().replace(/\s+/g, ' ').toLowerCase();
  return token || null;
}
