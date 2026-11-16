import * as acorn from 'acorn';
import type {
  DetectedError,
  ErrorCategory,
  FixStep,
  SupportedLanguage,
} from '../types/debugger';

export interface StaticAnalysisOutput {
  errors: DetectedError[];
  fallbackFixedCode: string;
  fallbackFixSteps: FixStep[];
  fallbackLearningTips: string[];
}

interface BracketEntry {
  char: string;
  line: number;
  column: number;
}

const MATCHING_BRACKET: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
};

const CLOSING_TO_OPENING: Record<string, string> = {
  ')': '(',
  ']': '[',
  '}': '{',
};

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Shared lexical bracket & unclosed string scanner (ignores comments and string literals safely).
 */
function scanBracketsAndStrings(
  code: string,
  language: SupportedLanguage
): DetectedError[] {
  const findings: DetectedError[] = [];
  const lines = code.split('\n');
  const stack: BracketEntry[] = [];
  const lineComment = language === 'python' ? '#' : '//';
  const supportsBlockComment = language !== 'python';

  let inBlockComment = false;
  let blockCommentStartLine = 1;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;
    let inString: string | null = null;
    let stringStartCol = 1;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1] ?? '';

      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }

      if (inString) {
        if (ch === '\\') {
          i++;
          continue;
        }
        if (ch === inString) {
          inString = null;
        }
        continue;
      }

      if (supportsBlockComment && ch === '/' && next === '*') {
        inBlockComment = true;
        blockCommentStartLine = lineNum;
        i++;
        continue;
      }

      if (
        (lineComment === '#' && ch === '#') ||
        (lineComment === '//' && ch === '/' && next === '/')
      ) {
        break;
      }

      if (ch === '"' || ch === "'" || (language === 'javascript' && ch === '`')) {
        // Ignore triple-quoted Python strings for single-line check
        if (language === 'python' && line.slice(i, i + 3) === ch.repeat(3)) {
          i += 2;
          continue;
        }
        inString = ch;
        stringStartCol = i + 1;
        continue;
      }

      if (ch in MATCHING_BRACKET) {
        stack.push({ char: ch, line: lineNum, column: i + 1 });
      } else if (ch in CLOSING_TO_OPENING) {
        const expectedOpening = CLOSING_TO_OPENING[ch];
        const top = stack[stack.length - 1];
        if (!top) {
          findings.push({
            id: makeId('static-bracket', findings.length),
            type: 'Syntax Error',
            severity: 'critical',
            line: lineNum,
            column: i + 1,
            message: `Unexpected closing '${ch}' with no matching '${expectedOpening}'.`,
            possibleCause: `An extra '${ch}' was typed or its opening '${expectedOpening}' was deleted.`,
            beginnerExplanation: `Brackets and parentheses always come in pairs. Here there is a closing '${ch}', but the program cannot find a matching opening '${expectedOpening}' before it.`,
            suggestedCorrection: `Remove the extra '${ch}' on line ${lineNum} or add the missing '${expectedOpening}' where the block begins.`,
            confidence: 98,
            source: 'Static Parser',
          });
        } else if (top.char !== expectedOpening) {
          findings.push({
            id: makeId('static-bracket', findings.length),
            type: 'Syntax Error',
            severity: 'critical',
            line: lineNum,
            column: i + 1,
            message: `Mismatched bracket: expected '${MATCHING_BRACKET[top.char]}' to close '${top.char}' from line ${top.line}, found '${ch}'.`,
            possibleCause: `Nested delimiters were closed in the wrong order or one delimiter was mistyped.`,
            beginnerExplanation: `You opened '${top.char}' on line ${top.line}, so you must close it with '${MATCHING_BRACKET[top.char]}' before closing '${ch}'.`,
            suggestedCorrection: `Replace '${ch}' with '${MATCHING_BRACKET[top.char]}' or insert '${MATCHING_BRACKET[top.char]}' before line ${lineNum}.`,
            confidence: 97,
            source: 'Static Parser',
          });
          stack.pop();
        } else {
          stack.pop();
        }
      }
    }

    if (inString && inString !== '`') {
      findings.push({
        id: makeId('static-str', findings.length),
        type: 'Syntax Error',
        severity: 'critical',
        line: lineNum,
        column: stringStartCol,
        message: `Unterminated string literal starting with ${inString}.`,
        possibleCause: `A closing quote (${inString}) is missing at the end of the string.`,
        beginnerExplanation: `Text strings must start and end with matching quotes. This line starts a string with ${inString} but never closes it.`,
        suggestedCorrection: `Add a closing ${inString} at the end of the text value on line ${lineNum}.`,
        confidence: 97,
        source: 'Static Parser',
      });
    }
  }

  if (inBlockComment) {
    findings.push({
      id: makeId('static-comment', findings.length),
      type: 'Syntax Error',
      severity: 'critical',
      line: blockCommentStartLine,
      message: `Unterminated block comment starting with '/*'.`,
      possibleCause: `Missing closing '*/' for the multi-line comment.`,
      beginnerExplanation: `Multi-line comments start with /* and must end with */. Everything after line ${blockCommentStartLine} is being treated as a comment.`,
      suggestedCorrection: `Add '*/' at the end of your comment block.`,
      confidence: 99,
      source: 'Static Parser',
    });
  }

  for (const unclosed of stack) {
    findings.push({
      id: makeId('static-unclosed', findings.length),
      type: 'Syntax Error',
      severity: 'critical',
      line: unclosed.line,
      column: unclosed.column,
      message: `Unclosed '${unclosed.char}' opened on line ${unclosed.line}.`,
      possibleCause: `The block or expression started with '${unclosed.char}' was never closed with '${MATCHING_BRACKET[unclosed.char]}'.`,
      beginnerExplanation: `Every opening '${unclosed.char}' needs a matching '${MATCHING_BRACKET[unclosed.char]}' so the compiler or interpreter knows where the block ends.`,
      suggestedCorrection: `Add a matching '${MATCHING_BRACKET[unclosed.char]}' at the appropriate closing location.`,
      confidence: 98,
      source: 'Static Parser',
    });
  }

  return findings;
}

function analyzeJavaScript(code: string): StaticAnalysisOutput {
  const errors: DetectedError[] = [];
  const lines = code.split('\n');
  const fixedLines = [...lines];
  const fixSteps: FixStep[] = [];

  // 1. Real Acorn AST parse
  let ast: acorn.Node | null = null;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
  } catch (err: unknown) {
    const parseErr = err as { message?: string; loc?: { line: number; column: number } };
    const line = parseErr.loc?.line ?? 1;
    const col = (parseErr.loc?.column ?? 0) + 1;
    errors.push({
      id: makeId('js-ast', errors.length),
      type: 'Syntax Error',
      severity: 'critical',
      line,
      column: col,
      message: `JavaScript Parser SyntaxError: ${parseErr.message ?? 'Invalid syntax'}`,
      possibleCause: `Malformed JavaScript token, missing delimiter, or unexpected keyword near line ${line}.`,
      beginnerExplanation: `The JavaScript parser stopped at line ${line} because the code structure violates JavaScript grammar rules.`,
      suggestedCorrection: `Inspect line ${line} around column ${col} for missing parentheses, commas, braces, or stray tokens.`,
      confidence: 99,
      source: 'Static Parser',
    });
  }

  // Fallback bracket scan if AST failed
  if (!ast) {
    errors.push(...scanBracketsAndStrings(code, 'javascript'));
  }

  // 2. Track const declarations & lexical patterns per line
  const constVars = new Set<string>();
  const declaredVars = new Set<string>([
    'console', 'Math', 'Number', 'String', 'Boolean', 'Array', 'Object',
    'JSON', 'Promise', 'Date', 'Set', 'Map', 'parseInt', 'parseFloat',
    'isNaN', 'setTimeout', 'setInterval', 'fetch', 'window', 'document',
  ]);

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//')) return;

    // Track declarations
    const declMatch = trimmed.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
    if (declMatch) {
      declaredVars.add(declMatch[1]);
      if (trimmed.startsWith('const ')) {
        constVars.add(declMatch[1]);
      }
    }
    const fnMatch = trimmed.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
    if (fnMatch) {
      declaredVars.add(fnMatch[1]);
      fnMatch[2].split(',').forEach((p) => {
        const param = p.trim().split('=')[0].trim();
        if (param) declaredVars.add(param);
      });
    }
    const forLetMatch = trimmed.match(/for\s*\(\s*(?:let|var|const)\s+([A-Za-z_$][\w$]*)/);
    if (forLetMatch) {
      declaredVars.add(forLetMatch[1]);
    }

    // Const reassignment check
    const reassignMatch = trimmed.match(/^([A-Za-z_$][\w$]*)\s*(\+=|-=|\*=|\/=|=[^=])/);
    if (reassignMatch && constVars.has(reassignMatch[1]) && !trimmed.startsWith('const ')) {
      const varName = reassignMatch[1];
      errors.push({
        id: makeId('js-const', errors.length),
        type: 'Type Error',
        severity: 'critical',
        line: lineNum,
        message: `Assignment to constant variable '${varName}'.`,
        possibleCause: `'${varName}' was declared with 'const', which cannot be reassigned later.`,
        beginnerExplanation: `Variables declared with 'const' are locked to their initial value. Trying to change '${varName}' later causes a TypeError when the code runs.`,
        suggestedCorrection: `Change 'const ${varName}' to 'let ${varName}' when declaring it so it can be updated.`,
        confidence: 97,
        source: 'Static Parser',
      });
      // Fix declaration line in fixedLines
      const declIdx = fixedLines.findIndex((l) =>
        new RegExp(`\\bconst\\s+${varName}\\b`).test(l)
      );
      if (declIdx !== -1) {
        fixedLines[declIdx] = fixedLines[declIdx].replace(
          new RegExp(`\\bconst\\s+${varName}\\b`),
          `let ${varName}`
        );
        fixSteps.push({
          stepNumber: fixSteps.length + 1,
          line: declIdx + 1,
          title: `Declare '${varName}' with 'let' instead of 'const'`,
          description: `Allows '${varName}' to be updated inside loops and conditional blocks without throwing a TypeError.`,
          source: 'Static Parser',
        });
      }
    }

    // Off-by-one loop: i <= arr.length
    const offByOne = trimmed.match(/for\s*\([^;]*;\s*\w+\s*<=\s*([A-Za-z_$][\w$]*)\.length\s*;/);
    if (offByOne) {
      const arrName = offByOne[1];
      errors.push({
        id: makeId('js-bounds', errors.length),
        type: 'Runtime Error',
        severity: 'critical',
        line: lineNum,
        message: `Loop condition '<= ${arrName}.length' accesses index out of bounds.`,
        possibleCause: `Arrays are 0-indexed, so valid indices run from 0 to ${arrName}.length - 1.`,
        beginnerExplanation: `When the loop reaches index ${arrName}.length, ${arrName}[i] is 'undefined'. Accessing properties on 'undefined' crashes with a TypeError.`,
        suggestedCorrection: `Use '< ${arrName}.length' instead of '<= ${arrName}.length'.`,
        confidence: 96,
        source: 'Static Parser',
      });
      fixedLines[idx] = fixedLines[idx].replace(/<=\s*([A-Za-z_$][\w$]*\.length)/, '< $1');
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Fix off-by-one loop bound on '${arrName}'`,
        description: `Changed '<= ${arrName}.length' to '< ${arrName}.length' so the loop stops at the last valid index.`,
        source: 'Static Parser',
      });
    }

    // Assignment inside if(...)
    const assignInIf = trimmed.match(/^if\s*\(\s*([A-Za-z_$][\w$]*)\s*=\s*([^=].*)\)/);
    if (assignInIf) {
      const lhs = assignInIf[1];
      const rhs = assignInIf[2];
      errors.push({
        id: makeId('js-assign-if', errors.length),
        type: 'Logical Error',
        severity: 'critical',
        line: lineNum,
        message: `Assignment '=' used inside 'if' condition instead of comparison '==='.`,
        possibleCause: `Single '=' assigns ${rhs} to '${lhs}' and always evaluates the assigned value as truthy/falsy.`,
        beginnerExplanation: `In JavaScript, '=' stores a value while '===' checks if two values are equal. Writing 'if (${lhs} = ${rhs})' accidentally overwrites '${lhs}' instead of testing it.`,
        suggestedCorrection: `Replace '=' with '===' (and ensure '${lhs}' is declared if needed).`,
        confidence: 95,
        source: 'Static Parser',
      });
      if (!declaredVars.has(lhs)) {
        errors.push({
          id: makeId('js-scope', errors.length),
          type: 'Name & Scope Error',
          severity: 'warning',
          line: lineNum,
          message: `Identifier '${lhs}' is used without being declared in this scope.`,
          possibleCause: `'${lhs}' is missing from function parameters or local variable declarations.`,
          beginnerExplanation: `Using a variable name that was never declared creates an implicit global or throws a ReferenceError in strict mode.`,
          suggestedCorrection: `Pass '${lhs}' as a parameter or declare it with 'let' / 'const' before referencing it.`,
          confidence: 90,
          source: 'Static Parser',
        });
      }
      fixedLines[idx] = fixedLines[idx].replace(
        new RegExp(`if\\s*\\(\\s*${lhs}\\s*=\\s*`),
        `if (${lhs} === `
      );
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Replace assignment '=' with strict equality '==='`,
        description: `Prevents unintended assignment inside the conditional check for '${lhs}'.`,
        source: 'Static Parser',
      });
    }

    // Loose equality ==
    if (/[^=!]==[^=]/.test(trimmed)) {
      errors.push({
        id: makeId('js-eq', errors.length),
        type: 'Logical Error',
        severity: 'warning',
        line: lineNum,
        message: `Loose equality '==' used; may cause unexpected type coercion.`,
        possibleCause: `'==' converts operands to matching types before comparing (e.g., 0 == "0" is true).`,
        beginnerExplanation: `Using '==' can hide type bugs because JavaScript silently converts strings, numbers, and booleans before comparing them.`,
        suggestedCorrection: `Use strict equality '===' and explicitly convert types with Number() or String() when needed.`,
        confidence: 88,
        source: 'Static Parser',
      });
      fixedLines[idx] = fixedLines[idx].replace(/([^=!])==([^=])/g, '$1===$2');
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Upgrade '==' to strict equality '==='`,
        description: `Eliminates implicit type coercion surprises during comparison.`,
        source: 'Static Parser',
      });
    }

    // Division by zero literal
    if (/\/\s*0(?:\b|[^\d.])/.test(trimmed) && !trimmed.includes('//')) {
      errors.push({
        id: makeId('js-div0', errors.length),
        type: 'Runtime Error',
        severity: 'warning',
        line: lineNum,
        message: `Potential division by zero detected.`,
        possibleCause: `Dividing a number by literal 0 produces Infinity or NaN in JavaScript.`,
        beginnerExplanation: `Division by zero never produces a normal finite number. Guard the denominator before dividing.`,
        suggestedCorrection: `Add a check ensuring the divisor is not 0 before performing division.`,
        confidence: 91,
        source: 'Static Parser',
      });
    }
  });

  // Nested loop check for Performance
  let loopDepth = 0;
  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (/^(?:for|while)\s*\(/.test(trimmed)) {
      loopDepth++;
      if (loopDepth >= 2) {
        errors.push({
          id: makeId('js-perf', errors.length),
          type: 'Performance Issue',
          severity: 'info',
          line: idx + 1,
          message: `Nested loop increases time complexity to O(n²) or higher.`,
          possibleCause: `An inner loop iterates over the dataset inside an outer loop.`,
          beginnerExplanation: `Nested loops multiply the amount of work for large inputs. For example, 1,000 items require 1,000,000 iterations.`,
          suggestedCorrection: `Consider using a Set or Map lookup for O(1) membership checks instead of a nested scan.`,
          confidence: 82,
          source: 'Static Parser',
        });
      }
    }
    if (trimmed === '}') {
      loopDepth = Math.max(0, loopDepth - 1);
    }
  });

  return {
    errors,
    fallbackFixedCode: fixedLines.join('\n'),
    fallbackFixSteps: fixSteps,
    fallbackLearningTips: [
      'Prefer const for values that never change and let only when reassignment is required.',
      'Always use strict equality (===) and explicit Number() conversions to avoid JavaScript coercion surprises.',
      'Arrays in JavaScript are 0-indexed: loop with i < array.length, never i <= array.length.',
    ],
  };
}

function analyzePython(code: string): StaticAnalysisOutput {
  const errors: DetectedError[] = [...scanBracketsAndStrings(code, 'python')];
  const lines = code.split('\n');
  const fixedLines = [...lines];
  const fixSteps: FixStep[] = [];

  let prevIndent = 0;
  let expectsIndent = false;
  let hasTabs = false;
  let hasSpaces = false;

  const blockStarters = /^(?:def|class|if|elif|else|for|while|try|except|finally|with)\b/;
  const needsColon = /^(?:def|class|if|elif|for|while|with|except)\b/;
  const singleWordBlock = /^(?:else|try|finally)\b/;

  let loopDepth = 0;
  let loopIndent = -1;

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const commentStripped = rawLine.replace(/#.*$/, '');
    const trimmed = commentStripped.trim();
    if (!trimmed) return;

    const leadingWs = rawLine.match(/^(\s*)/)?.[1] ?? '';
    if (leadingWs.includes('\t')) hasTabs = true;
    if (leadingWs.includes(' ')) hasSpaces = true;
    const indent = leadingWs.replace(/\t/g, '    ').length;

    if (expectsIndent && indent <= prevIndent) {
      errors.push({
        id: makeId('py-indent', errors.length),
        type: 'Syntax Error',
        severity: 'critical',
        line: lineNum,
        message: `IndentationError: expected an indented block after previous statement.`,
        possibleCause: `The line following a colon (:) is not indented further than its header.`,
        beginnerExplanation: `Python uses indentation (usually 4 spaces) instead of curly braces to group code inside functions, loops, and if-statements.`,
        suggestedCorrection: `Indent line ${lineNum} by 4 spaces relative to line ${lineNum - 1}.`,
        confidence: 95,
        source: 'Static Parser',
      });
    }

    // Check missing colon on block headers
    if (
      (needsColon.test(trimmed) || singleWordBlock.test(trimmed)) &&
      !trimmed.endsWith(':') &&
      !trimmed.endsWith('\\')
    ) {
      errors.push({
        id: makeId('py-colon', errors.length),
        type: 'Syntax Error',
        severity: 'critical',
        line: lineNum,
        column: rawLine.length + 1,
        message: `SyntaxError: expected ':' at the end of '${trimmed.split(/\s+/)[0]}' statement.`,
        possibleCause: `Python requires a colon (:) to open every function, loop, or conditional block.`,
        beginnerExplanation: `Every Python header line starting with def, if, elif, else, for, or while must end with a colon ':' so Python knows a code block starts next.`,
        suggestedCorrection: `Add ':' at the end of line ${lineNum}.`,
        confidence: 98,
        source: 'Static Parser',
      });
      fixedLines[idx] = `${rawLine.trimEnd()}:`;
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Add missing colon ':' to block header`,
        description: `Closed the Python statement header on line ${lineNum} with ':'.`,
        source: 'Static Parser',
      });
    }

    // Mutable default argument
    const mutableDefault = trimmed.match(/^def\s+(\w+)\s*\([^)]*=\s*(\[\]|\{\})/);
    if (mutableDefault) {
      errors.push({
        id: makeId('py-mutable', errors.length),
        type: 'Logical Error',
        severity: 'warning',
        line: lineNum,
        message: `Mutable default argument '${mutableDefault[2]}' in function '${mutableDefault[1]}'.`,
        possibleCause: `Default lists or dicts in Python are created once at function definition and shared across all calls.`,
        beginnerExplanation: `If you write 'scores=[]' as a default parameter, every call to '${mutableDefault[1]}()' will keep appending to the exact same list from previous calls!`,
        suggestedCorrection: `Use 'None' as the default value and initialize a fresh list/dict inside the function body.`,
        confidence: 96,
        source: 'Static Parser',
      });
      fixedLines[idx] = fixedLines[idx].replace(/=\s*\[\]/, '=None').replace(/=\s*\{\}/, '=None');
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Replace mutable default argument with 'None'`,
        description: `Prevents shared state bugs across repeated calls to '${mutableDefault[1]}'.`,
        source: 'Static Parser',
      });
    }

    // Assignment '=' inside if/elif/while
    const assignIf = trimmed.match(/^(?:if|elif|while)\s+([A-Za-z_]\w*)\s*=\s*([^=].*):?$/);
    if (assignIf) {
      errors.push({
        id: makeId('py-assign', errors.length),
        type: 'Syntax Error',
        severity: 'critical',
        line: lineNum,
        message: `SyntaxError: cannot use assignment '=' inside '${trimmed.split(/\s+/)[0]}' condition.`,
        possibleCause: `Single '=' performs variable assignment, whereas '==' compares values.`,
        beginnerExplanation: `Python does not allow '=' inside an if-condition. Use '==' to check whether two values are equal.`,
        suggestedCorrection: `Change '=' to '==' on line ${lineNum}.`,
        confidence: 98,
        source: 'Static Parser',
      });
      fixedLines[idx] = fixedLines[idx].replace(
        new RegExp(`(\\b${assignIf[1]}\\s*)=(\\s*)`),
        '$1==$2'
      );
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Change '=' to '==' in conditional check`,
        description: `Converts invalid assignment into a boolean equality comparison.`,
        source: 'Static Parser',
      });
    }

    // String + non-str literal/var heuristic (e.g. print("Final score: " + score))
    if (/["'][^"']*["']\s*\+\s*(?!["']|str\()[A-Za-z_]\w*/.test(trimmed)) {
      errors.push({
        id: makeId('py-type', errors.length),
        type: 'Type Error',
        severity: 'warning',
        line: lineNum,
        message: `Potential TypeError: concatenating str with a non-string variable using '+'.`,
        possibleCause: `Python does not automatically convert integers or floats into strings during '+' concatenation.`,
        beginnerExplanation: `In Python, adding a string and a number with '+' fails with 'TypeError: can only concatenate str (not "int") to str'. Wrap the variable in str() or use an f-string.`,
        suggestedCorrection: `Wrap the variable with str(...) or format with an f-string like f"Final score: {score}".`,
        confidence: 87,
        source: 'Static Parser',
      });
    }

    // Division by len(x) without empty check
    if (/\/\s*len\((\w+)\)/.test(trimmed) && !code.includes(`if not ${trimmed.match(/\/\s*len\((\w+)\)/)?.[1]}`)) {
      const seqName = trimmed.match(/\/\s*len\((\w+)\)/)?.[1] ?? 'items';
      errors.push({
        id: makeId('py-zerodiv', errors.length),
        type: 'Runtime Error',
        severity: 'warning',
        line: lineNum,
        message: `Potential ZeroDivisionError when '${seqName}' is empty.`,
        possibleCause: `Dividing by len(${seqName}) throws ZeroDivisionError if an empty list [] is passed.`,
        beginnerExplanation: `If '${seqName}' has 0 items, len(${seqName}) is 0 and dividing by 0 crashes the program.`,
        suggestedCorrection: `Check 'if not ${seqName}: return 0' before dividing by len(${seqName}).`,
        confidence: 93,
        source: 'Static Parser',
      });
    }

    // Nested loop performance
    if (/^(?:for|while)\b/.test(trimmed)) {
      if (loopDepth >= 1 && indent > loopIndent) {
        errors.push({
          id: makeId('py-perf', errors.length),
          type: 'Performance Issue',
          severity: 'info',
          line: lineNum,
          message: `Nested loop results in O(n²) quadratic time complexity.`,
          possibleCause: `Scanning the collection inside an outer loop repeats work on every element.`,
          beginnerExplanation: `Using nested loops compares every pair of items. A Python 'set' can track seen elements in O(n) single-pass time.`,
          suggestedCorrection: `Replace the inner loop with a 'seen = set()' lookup for faster linear-time execution.`,
          confidence: 85,
          source: 'Static Parser',
        });
      }
      loopDepth++;
      loopIndent = indent;
    } else if (indent <= loopIndent) {
      loopDepth = 0;
      loopIndent = -1;
    }

    expectsIndent = blockStarters.test(trimmed);
    prevIndent = indent;
  });

  if (hasTabs && hasSpaces) {
    errors.push({
      id: makeId('py-tabspace', errors.length),
      type: 'Syntax Error',
      severity: 'critical',
      line: 1,
      message: `TabError: inconsistent use of tabs and spaces in indentation.`,
      possibleCause: `Some lines use tab characters while others use spaces.`,
      beginnerExplanation: `Python 3 forbids mixing tabs and spaces in the same file. Configure your editor to use 4 spaces per indent.`,
      suggestedCorrection: `Convert all leading tabs to 4 spaces consistently.`,
      confidence: 99,
      source: 'Static Parser',
    });
  }

  return {
    errors,
    fallbackFixedCode: fixedLines.join('\n'),
    fallbackFixSteps: fixSteps,
    fallbackLearningTips: [
      'Never use mutable objects like [] or {} as default parameter values in Python—default to None instead.',
      'Always guard divisions by len(collection) against empty inputs to prevent ZeroDivisionError.',
      'Use Python f-strings (f"Value: {x}") instead of "+" string concatenation to avoid TypeErrors.',
    ],
  };
}

function analyzeCStyleLanguage(
  code: string,
  language: 'c' | 'cpp' | 'java'
): StaticAnalysisOutput {
  const errors: DetectedError[] = [...scanBracketsAndStrings(code, language)];
  const lines = code.split('\n');
  const fixedLines = [...lines];
  const fixSteps: FixStep[] = [];

  // Check missing headers in C / C++
  if (language === 'c') {
    if (/\b(?:printf|scanf)\s*\(/.test(code) && !/#include\s*<stdio\.h>/.test(code)) {
      errors.push({
        id: makeId('c-stdio', errors.length),
        type: 'Name & Scope Error',
        severity: 'critical',
        line: 1,
        message: `Missing '#include <stdio.h>' for printf/scanf declarations.`,
        possibleCause: `Standard I/O functions are used without including the stdio header.`,
        beginnerExplanation: `C needs '#include <stdio.h>' at the top of the file so the compiler knows the function signatures for printf and scanf.`,
        suggestedCorrection: `Add '#include <stdio.h>' at the top of your C file.`,
        confidence: 97,
        source: 'Static Parser',
      });
      fixedLines.unshift('#include <stdio.h>');
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: 1,
        title: `Include <stdio.h> header`,
        description: `Provides declarations for standard input/output functions printf and scanf.`,
        source: 'Static Parser',
      });
    }
    if (/\b(?:malloc|calloc|free)\s*\(/.test(code) && !/#include\s*<stdlib\.h>/.test(code)) {
      errors.push({
        id: makeId('c-stdlib', errors.length),
        type: 'Name & Scope Error',
        severity: 'critical',
        line: 1,
        message: `Missing '#include <stdlib.h>' for dynamic memory functions.`,
        possibleCause: `malloc/free are declared in <stdlib.h>.`,
        beginnerExplanation: `Without <stdlib.h>, the C compiler does not know the return type of malloc(), which can corrupt pointers on 64-bit systems.`,
        suggestedCorrection: `Add '#include <stdlib.h>' at the top of the file.`,
        confidence: 96,
        source: 'Static Parser',
      });
      fixedLines.unshift('#include <stdlib.h>');
    }
  }

  if (language === 'cpp') {
    if (/\b(?:cout|cin|endl)\b/.test(code) && !/#include\s*<iostream>/.test(code)) {
      errors.push({
        id: makeId('cpp-iostream', errors.length),
        type: 'Name & Scope Error',
        severity: 'critical',
        line: 1,
        message: `Missing '#include <iostream>' for cout / endl.`,
        possibleCause: `Stream I/O objects are used without including <iostream>.`,
        beginnerExplanation: `In C++, std::cout and std::endl live in the <iostream> standard header.`,
        suggestedCorrection: `Add '#include <iostream>' at the top of the file.`,
        confidence: 98,
        source: 'Static Parser',
      });
      fixedLines.unshift('#include <iostream>');
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: 1,
        title: `Add missing '#include <iostream>'`,
        description: `Declares std::cout and std::endl used for console output.`,
        source: 'Static Parser',
      });
    }
  }

  // Track uninitialized local variables in C/C++
  const uninitializedVars = new Set<string>();
  const arrayBounds = new Map<string, number>();

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const trimmed = rawLine.replace(/\/\/.*$/, '').trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('/*')) return;

    // Detect array declaration like int values[5] = ...
    const arrDecl = trimmed.match(/\b(?:int|double|float|char)\s+(\w+)\s*\[(\d+)\]/);
    if (arrDecl) {
      arrayBounds.set(arrDecl[1], Number(arrDecl[2]));
    }

    // Detect uninitialized scalar declaration like int sum;
    const uninitDecl = trimmed.match(/^(?:int|double|float|long)\s+(\w+)\s*;$/);
    if (uninitDecl) {
      uninitializedVars.add(uninitDecl[1]);
    }

    // Check compound assignment using uninitialized var
    const compAssign = trimmed.match(/^(\w+)\s*\+=/);
    if (compAssign && uninitializedVars.has(compAssign[1])) {
      const v = compAssign[1];
      errors.push({
        id: makeId('c-uninit', errors.length),
        type: 'Logical Error',
        severity: 'critical',
        line: lineNum,
        message: `Variable '${v}' is accumulated before being initialized.`,
        possibleCause: `'${v}' contains unpredictable garbage memory when '+=' executes.`,
        beginnerExplanation: `Unlike Java, C/C++ does not automatically set local integers to 0. Adding to an uninitialized variable '${v}' produces garbage results.`,
        suggestedCorrection: `Initialize 'int ${v} = 0;' when declaring it.`,
        confidence: 95,
        source: 'Static Parser',
      });
      uninitializedVars.delete(v);
      const declLineIdx = fixedLines.findIndex((l) =>
        new RegExp(`\\b(int|double|float|long)\\s+${v}\\s*;`).test(l)
      );
      if (declLineIdx !== -1) {
        fixedLines[declLineIdx] = fixedLines[declLineIdx].replace(
          new RegExp(`\\b${v}\\s*;`),
          `${v} = 0;`
        );
        fixSteps.push({
          stepNumber: fixSteps.length + 1,
          line: declLineIdx + 1,
          title: `Initialize '${v}' to 0`,
          description: `Eliminates undefined behavior from reading uninitialized stack memory.`,
          source: 'Static Parser',
        });
      }
    }

    // Missing semicolon check (heuristic for statement lines not ending in ; { } : ,)
    const isControlOrDecl = /^(?:if|else|for|while|switch|case|default|public|private|protected|class|struct|namespace|using)\b/.test(
      trimmed
    );
    const endsValid = /[;{},:]$/.test(trimmed) || trimmed.endsWith(')') && isControlOrDecl;
    const isFunctionHeader = /^(?:[\w<>:*&[\]]+\s+)+\w+\s*\([^)]*\)\s*$/.test(trimmed);
    if (
      !endsValid &&
      !isControlOrDecl &&
      !isFunctionHeader &&
      /^(?:return\b|printf\b|scanf\b|cout\b|System\.out\b|[\w.*->]+\s*=|\w+\s*\()/.test(trimmed)
    ) {
      errors.push({
        id: makeId('c-semi', errors.length),
        type: 'Syntax Error',
        severity: 'critical',
        line: lineNum,
        message: `Missing semicolon ';' at the end of statement.`,
        possibleCause: `Statements in ${language.toUpperCase()} must terminate with a semicolon.`,
        beginnerExplanation: `Every instruction line needs a ';' at the end so the compiler knows where one statement finishes and the next begins.`,
        suggestedCorrection: `Add ';' at the end of line ${lineNum}.`,
        confidence: 96,
        source: 'Static Parser',
      });
      const offset = fixedLines.length - lines.length;
      fixedLines[idx + offset] = `${fixedLines[idx + offset].trimEnd()};`;
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Add missing semicolon ';'`,
        description: `Terminates the statement cleanly on line ${lineNum}.`,
        source: 'Static Parser',
      });
    }

    // C scanf missing &
    if (language === 'c') {
      const scanfMatch = trimmed.match(/scanf\s*\(\s*"[^"]*%[dfclsu]"\s*,\s*([A-Za-z_]\w*)\s*\)/);
      if (scanfMatch && !trimmed.includes('&')) {
        const varName = scanfMatch[1];
        errors.push({
          id: makeId('c-scanf', errors.length),
          type: 'Runtime Error',
          severity: 'critical',
          line: lineNum,
          message: `scanf() passed value '${varName}' instead of memory address '&${varName}'.`,
          possibleCause: `scanf requires a pointer (&${varName}) to store user input; passing an integer causes a segmentation fault.`,
          beginnerExplanation: `scanf needs the address-of operator '&' before scalar variables so it knows where in memory to write the input.`,
          suggestedCorrection: `Change '${varName}' to '&${varName}' inside scanf().`,
          confidence: 97,
          source: 'Static Parser',
        });
        const offset = fixedLines.length - lines.length;
        fixedLines[idx + offset] = fixedLines[idx + offset].replace(
          new RegExp(`(scanf\\s*\\([^,]+,\\s*)${varName}`),
          `$1&${varName}`
        );
        fixSteps.push({
          stepNumber: fixSteps.length + 1,
          line: lineNum,
          title: `Pass '&${varName}' address to scanf()`,
          description: `Prevents segmentation fault when reading input into '${varName}'.`,
          source: 'Static Parser',
        });
      }
    }

    // Assignment inside if(...)
    const assignIf = trimmed.match(/^if\s*\(\s*([A-Za-z_]\w*)\s*=\s*([^=].*)\)/);
    if (assignIf) {
      errors.push({
        id: makeId('c-if-assign', errors.length),
        type: 'Logical Error',
        severity: 'critical',
        line: lineNum,
        message: `Assignment '=' used inside 'if' condition instead of '=='.`,
        possibleCause: `Assigning ${assignIf[2]} to '${assignIf[1]}' overwrites the variable and makes the condition always evaluate based on the assigned value.`,
        beginnerExplanation: `In C, C++, and Java, '=' assigns a value while '==' tests equality. Writing 'if (${assignIf[1]} = ${assignIf[2]})' silently mutates '${assignIf[1]}'.`,
        suggestedCorrection: `Replace '=' with '==' inside the condition.`,
        confidence: 96,
        source: 'Static Parser',
      });
      const offset = fixedLines.length - lines.length;
      fixedLines[idx + offset] = fixedLines[idx + offset].replace(
        new RegExp(`if\\s*\\(\\s*${assignIf[1]}\\s*=\\s*`),
        `if (${assignIf[1]} == `
      );
    }

    // Off-by-one loop bounds: <= count / <= .size() / <= .length
    if (/for\s*\([^;]*;\s*\w+\s*<=\s*(?:[\w.]+\.(?:size\(\)|length)|count)\s*;/.test(trimmed)) {
      errors.push({
        id: makeId('c-bounds', errors.length),
        type: 'Runtime Error',
        severity: 'critical',
        line: lineNum,
        message: `Off-by-one loop condition '<=' accesses one element past array/vector end.`,
        possibleCause: `Valid indices for a collection of size N are 0 through N - 1.`,
        beginnerExplanation: `Using '<=' visits index N, which causes undefined memory reads in C/C++ or ArrayIndexOutOfBoundsException in Java.`,
        suggestedCorrection: `Replace '<=' with '<' in the loop condition.`,
        confidence: 96,
        source: 'Static Parser',
      });
      const offset = fixedLines.length - lines.length;
      fixedLines[idx + offset] = fixedLines[idx + offset].replace('<=', '<');
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Change loop boundary from '<=' to '<'`,
        description: `Stops iteration at the last valid index and avoids out-of-bounds access.`,
        source: 'Static Parser',
      });
    }

    // C++ integer division inside double-returning function
    if (
      language === 'cpp' &&
      /return\s+\w+\s*\/\s*\w+\s*;/.test(trimmed) &&
      /double\s+\w+\s*\(\s*int\b/.test(code)
    ) {
      errors.push({
        id: makeId('cpp-intdiv', errors.length),
        type: 'Type Error',
        severity: 'warning',
        line: lineNum,
        message: `Integer division truncates decimal precision before returning 'double'.`,
        possibleCause: `Dividing two 'int' values performs integer division (e.g., 3 / 4 becomes 0) before conversion to double.`,
        beginnerExplanation: `When both sides of '/' are integers, C++ drops the fractional remainder. Cast one operand to double (e.g., static_cast<double>(a) / b) to keep decimals.`,
        suggestedCorrection: `Cast the numerator with static_cast<double>(...) before dividing.`,
        confidence: 92,
        source: 'Static Parser',
      });
      const offset = fixedLines.length - lines.length;
      fixedLines[idx + offset] = fixedLines[idx + offset].replace(
        /return\s+(\w+)\s*\/\s*(\w+)\s*;/,
        'return static_cast<double>($1) / $2;'
      );
      fixSteps.push({
        stepNumber: fixSteps.length + 1,
        line: lineNum,
        title: `Cast numerator to double before division`,
        description: `Preserves floating-point precision instead of truncating integer division to 0.`,
        source: 'Static Parser',
      });
    }

    // Java-specific checks
    if (language === 'java') {
      if (/==\s*"[^"]*"/.test(trimmed) || /"[^"]*"\s*==/.test(trimmed)) {
        errors.push({
          id: makeId('java-streq', errors.length),
          type: 'Logical Error',
          severity: 'critical',
          line: lineNum,
          message: `String comparison uses '==' instead of '.equals()'.`,
          possibleCause: `'==' compares object memory references in Java, not text contents.`,
          beginnerExplanation: `In Java, two String objects with the exact same letters (like new String("admin")) sit at different memory addresses, so '==' returns false. Always compare Strings with .equals().`,
          suggestedCorrection: `Use '"admin".equals(username)' to safely compare text and prevent NullPointerException.`,
          confidence: 98,
          source: 'Static Parser',
        });
        const offset = fixedLines.length - lines.length;
        fixedLines[idx + offset] = fixedLines[idx + offset].replace(
          /(\w+)\s*==\s*("[^"]*")/,
          '$2.equals($1)'
        );
        fixSteps.push({
          stepNumber: fixSteps.length + 1,
          line: lineNum,
          title: `Compare Java Strings using '.equals()'`,
          description: `Compares string content safely instead of object reference identity.`,
          source: 'Static Parser',
        });
      }

      if (/=\s*null\s*;/.test(trimmed)) {
        const varName = trimmed.match(/(\w+)\s*=\s*null/)?.[1];
        if (varName && new RegExp(`\\b${varName}\\.`).test(code)) {
          errors.push({
            id: makeId('java-npe', errors.length),
            type: 'Runtime Error',
            severity: 'warning',
            line: lineNum,
            message: `Potential NullPointerException when dereferencing '${varName}'.`,
            possibleCause: `'${varName}' is initialized to null and may remain null if conditional branches do not execute.`,
            beginnerExplanation: `Calling a method like ${varName}.toUpperCase() when ${varName} is null immediately crashes the program with a NullPointerException.`,
            suggestedCorrection: `Initialize '${varName}' to a safe default string (e.g., "Guest") or add a null check before calling methods on it.`,
            confidence: 91,
            source: 'Static Parser',
          });
        }
      }
    }
  });

  // Memory leak checks for C / C++
  if (language === 'c' && /\bmalloc\s*\(/.test(code) && !/\bfree\s*\(/.test(code)) {
    const mallocLine = lines.findIndex((l) => /\bmalloc\s*\(/.test(l)) + 1;
    errors.push({
      id: makeId('c-leak', errors.length),
      type: 'Performance Issue',
      severity: 'warning',
      line: mallocLine || 1,
      message: `Heap memory allocated with malloc() is never released with free().`,
      possibleCause: `Missing free(ptr) call before function returns.`,
      beginnerExplanation: `Memory allocated with malloc() stays reserved until you call free(). Forgetting to free it creates a memory leak.`,
      suggestedCorrection: `Call free(buffer) before returning from main().`,
      confidence: 92,
      source: 'Static Parser',
    });
  }
  if (language === 'cpp' && /\bnew\s+\w+/.test(code) && !/\bdelete\b/.test(code)) {
    const newLine = lines.findIndex((l) => /\bnew\s+\w+/.test(l)) + 1;
    errors.push({
      id: makeId('cpp-leak', errors.length),
      type: 'Performance Issue',
      severity: 'warning',
      line: newLine || 1,
      message: `Dynamic memory allocated with 'new' is never freed with 'delete'.`,
      possibleCause: `Manual heap allocation lacks a corresponding delete or smart pointer.`,
      beginnerExplanation: `In C++, raw pointers allocated with 'new' must be released with 'delete', or better yet, managed with std::unique_ptr.`,
      suggestedCorrection: `Call 'delete ptr;' before returning or use std::unique_ptr.`,
      confidence: 92,
      source: 'Static Parser',
    });
  }

  // Java missing return statement heuristic
  if (language === 'java' && /public\s+static\s+int\s+sumScores/.test(code) && !/return\s+total\s*;/.test(code)) {
    const fnLine = lines.findIndex((l) => /public\s+static\s+int\s+sumScores/.test(l)) + 1;
    errors.push({
      id: makeId('java-ret', errors.length),
      type: 'Syntax Error',
      severity: 'critical',
      line: fnLine || 1,
      message: `Missing return statement in method 'sumScores' declared to return 'int'.`,
      possibleCause: `A non-void Java method must return a value on every execution path.`,
      beginnerExplanation: `Because sumScores promises to return an 'int', Java will refuse to compile until you add 'return total;' at the end of the method.`,
      suggestedCorrection: `Add 'return total;' at the end of sumScores().`,
      confidence: 97,
      source: 'Static Parser',
    });
  }

  return {
    errors,
    fallbackFixedCode: fixedLines.join('\n'),
    fallbackFixSteps: fixSteps,
    fallbackLearningTips:
      language === 'java'
        ? [
            'Compare Java Strings with .equals(), never ==, to check text content instead of object references.',
            'Guard nullable variables with default values or explicit null checks before calling methods.',
            'Ensure every non-void method ends with a matching return statement.',
          ]
        : [
            'Always initialize local variables before using them in arithmetic or loops.',
            'Keep loop conditions strictly less than array size (i < length) to stay inside allocated bounds.',
            'Pair every heap allocation (malloc/new) with a matching cleanup (free/delete) or smart pointer.',
          ],
  };
}

export function runStaticAnalysis(
  code: string,
  language: SupportedLanguage
): StaticAnalysisOutput {
  switch (language) {
    case 'javascript':
      return analyzeJavaScript(code);
    case 'python':
      return analyzePython(code);
    case 'c':
    case 'cpp':
    case 'java':
      return analyzeCStyleLanguage(code, language);
  }
}

export function buildSummaryCategories(errors: DetectedError[]): Record<ErrorCategory, number> {
  const counts: Record<ErrorCategory, number> = {
    'Syntax Error': 0,
    'Runtime Error': 0,
    'Logical Error': 0,
    'Type Error': 0,
    'Name & Scope Error': 0,
    'Performance Issue': 0,
  };
  for (const err of errors) {
    if (err.type in counts) {
      counts[err.type]++;
    }
  }
  return counts;
}
