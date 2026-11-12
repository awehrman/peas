import type { LexiconRole, ParseMode } from "../ast/types.js";
import { normalizeText } from "../normalize/normalize-text.js";
import { type Token, tokenKey, tokenize } from "../normalize/tokenize.js";

import { LexiconSnapshotSchema } from "./schemas.js";
import type { LexiconEntryInput, LexiconMatch, LexiconSnapshot } from "./types.js";

interface TrieNode {
  children: Map<string, TrieNode>;
  entryIds: string[];
}

function createNode(): TrieNode {
  return { children: new Map(), entryIds: [] };
}

function insert(root: TrieNode, keys: string[], entryId: string): void {
  let node = root;
  for (const key of keys) {
    let child = node.children.get(key);
    if (!child) {
      child = createNode();
      node.children.set(key, child);
    }
    node = child;
  }
  node.entryIds.push(entryId);
}

/** Token keys for an entry's text, using the same normalization as input lines. */
export function entryTokenKeys(text: string): string[] {
  return tokenize(normalizeText(text).text).map(tokenKey);
}

export interface Lexicon {
  revision: number | null;
  entries: ReadonlyMap<string, LexiconEntryInput>;
  /** Every match in `tokens`, including overlapping and nested ones. */
  match(tokens: Token[], mode: ParseMode): LexiconMatch[];
}

/**
 * Builds token tries over an in-memory snapshot. Conservative parsing uses
 * only ACTIVE entries; exploratory parsing also sees PROPOSED ones. Throws a
 * ZodError when an id is not a UUID or appears twice.
 */
export function buildLexicon(snapshot: LexiconSnapshot): Lexicon {
  LexiconSnapshotSchema.parse(snapshot);

  const entries = new Map(snapshot.entries.map((entry) => [entry.id, entry]));
  const conservative = createNode();
  const exploratory = createNode();

  for (const entry of snapshot.entries) {
    const keys = entryTokenKeys(entry.text);
    if (keys.length === 0) continue;
    if ((entry.status ?? "ACTIVE") === "ACTIVE") insert(conservative, keys, entry.id);
    insert(exploratory, keys, entry.id);
  }

  function rolesFor(entryIds: string[]): LexiconRole[] {
    const roles = new Set<LexiconRole>();
    for (const id of entryIds) {
      const entry = entries.get(id);
      if (entry) roles.add(entry.role);
    }
    return [...roles];
  }

  return {
    revision: snapshot.revision,
    entries,
    match(tokens, mode) {
      const root = mode === "CONSERVATIVE" ? conservative : exploratory;
      const matches: LexiconMatch[] = [];

      tokens.forEach((startToken, tokenStart) => {
        let node: TrieNode | undefined = root;
        for (let index = tokenStart; index < tokens.length; index++) {
          const token = tokens[index];
          if (!token) break;
          node = node.children.get(tokenKey(token));
          if (!node) break;
          if (node.entryIds.length > 0) {
            matches.push({
              start: startToken.start,
              end: token.end,
              tokenStart,
              tokenEnd: index + 1,
              entryIds: [...node.entryIds],
              roles: rolesFor(node.entryIds),
            });
          }
        }
      });

      return matches;
    },
  };
}
