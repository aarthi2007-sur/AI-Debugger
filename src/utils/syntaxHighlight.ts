import type { SupportedLanguage } from '../types/debugger';

export type TokenKind =
  | 'comment'
  | 'string'
  | 'keyword'
  | 'type'
  | 'number'
  | 'function'
  | 'preprocessor'
  | 'plain';

export interface CodeToken {
  text: string;
  kind: TokenKind;
}

const KEYWORDS: Record<SupportedLanguage, Set<string>> = {
  python: new Set([
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not',
    'and', 'or', 'is', 'None', 'True', 'False', 'class', 'import', 'from',
    'as', 'try', 'except', 'finally', 'with', 'pass', 'break', 'continue',
    'lambda', 'yield', 'global', 'nonlocal', 'raise', 'assert',
  ]),
  c: new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
    'continue', 'return', 'sizeof', 'struct', 'typedef', 'enum', 'union',
    'const', 'static', 'extern', 'volatile', 'NULL',
  ]),
  cpp: new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
    'continue', 'return', 'sizeof', 'struct', 'class', 'public', 'private',
    'protected', 'using', 'namespace', 'new', 'delete', 'nullptr', 'true',
    'false', 'const', 'static', 'auto', 'virtual', 'override', 'template',
    'typename', 'static_cast',
  ]),
  java: new Set([
    'public', 'private', 'protected', 'static', 'final', 'class', 'interface',
    'extends', 'implements', 'if', 'else', 'for', 'while', 'do', 'switch',
    'case', 'default', 'break', 'continue', 'return', 'new', 'null', 'true',
    'false', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package',
    'this', 'super', 'void',
  ]),
  javascript: new Set([
    'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'default', 'break', 'continue', 'new', 'null',
    'undefined', 'true', 'false', 'try', 'catch', 'finally', 'throw', 'import',
    'export', 'from', 'async', 'await', 'class', 'extends', 'typeof', 'in', 'of',
  ]),
};

const TYPES: Record<SupportedLanguage, Set<string>> = {
  python: new Set(['int', 'float', 'str', 'list', 'dict', 'set', 'tuple', 'bool', 'len', 'range', 'print']),
  c: new Set(['int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned', 'size_t', 'printf', 'scanf', 'malloc', 'free']),
  cpp: new Set(['int', 'float', 'double', 'char', 'void', 'bool', 'string', 'vector', 'size_t', 'std', 'cout', 'cin', 'endl', 'make_unique']),
  java: new Set(['int', 'double', 'float', 'boolean', 'char', 'String', 'System', 'Integer', 'List', 'ArrayList', 'Map']),
  javascript: new Set(['Number', 'String', 'Boolean', 'Array', 'Object', 'Set', 'Map', 'console', 'Math', 'JSON', 'Promise']),
};

export function tokenizeLine(line: string, language: SupportedLanguage): CodeToken[] {
  const tokens: CodeToken[] = [];
  const kw = KEYWORDS[language];
  const tp = TYPES[language];
  let i = 0;

  // Preprocessor directives in C / C++
  if ((language === 'c' || language === 'cpp') && /^\s*#/.test(line)) {
    return [{ text: line, kind: 'preprocessor' }];
  }

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1] ?? '';

    // Line comments
    if ((language === 'python' && ch === '#') || (language !== 'python' && ch === '/' && next === '/')) {
      tokens.push({ text: line.slice(i), kind: 'comment' });
      break;
    }

    // String literals
    if (ch === '"' || ch === "'" || (language === 'javascript' && ch === '`')) {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === ch) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ text: line.slice(i, j), kind: 'string' });
      i = j;
      continue;
    }

    // Numbers
    if (/\d/.test(ch) && (i === 0 || !/[A-Za-z_$]/.test(line[i - 1]))) {
      let j = i + 1;
      while (j < line.length && /[\d.]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), kind: 'number' });
      i = j;
      continue;
    }

    // Identifiers / keywords / types / function calls
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const after = line[j];
      if (kw.has(word)) {
        tokens.push({ text: word, kind: 'keyword' });
      } else if (tp.has(word)) {
        tokens.push({ text: word, kind: 'type' });
      } else if (after === '(') {
        tokens.push({ text: word, kind: 'function' });
      } else {
        tokens.push({ text: word, kind: 'plain' });
      }
      i = j;
      continue;
    }

    // Plain punctuation / whitespace
    let j = i + 1;
    while (
      j < line.length &&
      !/[A-Za-z0-9_$"'`#/]/.test(line[j])
    ) {
      j++;
    }
    tokens.push({ text: line.slice(i, j), kind: 'plain' });
    i = j;
  }

  return tokens;
}

export const TOKEN_CLASSES: Record<TokenKind, string> = {
  comment: 'text-slate-500 italic',
  string: 'text-emerald-300',
  keyword: 'text-purple-400 font-medium',
  type: 'text-sky-300',
  number: 'text-amber-300',
  function: 'text-blue-300',
  preprocessor: 'text-violet-400',
  plain: 'text-slate-200',
};

export interface DiffRow {
  leftLineNum: number | null;
  rightLineNum: number | null;
  leftText: string;
  rightText: string;
  status: 'unchanged' | 'modified' | 'removed' | 'added';
}

/**
 * Computes aligned side-by-side line diff using Longest Common Subsequence (LCS).
 */
export function computeSideBySideDiff(original: string, fixed: string): DiffRow[] {
  const a = original.split('\n');
  const b = fixed.split('\n');
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const rawOps: Array<{ type: 'same' | 'del' | 'add'; left?: string; right?: string; li?: number; ri?: number }> = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rawOps.push({ type: 'same', left: a[i], right: b[j], li: i + 1, ri: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rawOps.push({ type: 'del', left: a[i], li: i + 1 });
      i++;
    } else {
      rawOps.push({ type: 'add', right: b[j], ri: j + 1 });
      j++;
    }
  }
  while (i < m) {
    rawOps.push({ type: 'del', left: a[i], li: i + 1 });
    i++;
  }
  while (j < n) {
    rawOps.push({ type: 'add', right: b[j], ri: j + 1 });
    j++;
  }

  // Pair adjacent del + add blocks into 'modified' rows for crisp side-by-side reading
  const rows: DiffRow[] = [];
  let idx = 0;
  while (idx < rawOps.length) {
    const op = rawOps[idx];
    if (op.type === 'same') {
      rows.push({
        leftLineNum: op.li ?? null,
        rightLineNum: op.ri ?? null,
        leftText: op.left ?? '',
        rightText: op.right ?? '',
        status: 'unchanged',
      });
      idx++;
    } else {
      const dels: typeof rawOps = [];
      const adds: typeof rawOps = [];
      while (idx < rawOps.length && rawOps[idx].type !== 'same') {
        if (rawOps[idx].type === 'del') dels.push(rawOps[idx]);
        else adds.push(rawOps[idx]);
        idx++;
      }
      const maxLen = Math.max(dels.length, adds.length);
      for (let k = 0; k < maxLen; k++) {
        const d = dels[k];
        const ad = adds[k];
        if (d && ad) {
          rows.push({
            leftLineNum: d.li ?? null,
            rightLineNum: ad.ri ?? null,
            leftText: d.left ?? '',
            rightText: ad.right ?? '',
            status: 'modified',
          });
        } else if (d) {
          rows.push({
            leftLineNum: d.li ?? null,
            rightLineNum: null,
            leftText: d.left ?? '',
            rightText: '',
            status: 'removed',
          });
        } else if (ad) {
          rows.push({
            leftLineNum: null,
            rightLineNum: ad.ri ?? null,
            leftText: '',
            rightText: ad.right ?? '',
            status: 'added',
          });
        }
      }
    }
  }

  return rows;
}
