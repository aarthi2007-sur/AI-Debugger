import { SAMPLE_CASES } from '../data/samples';
import type {
  AnalysisResult,
  DebuggingHistoryItem,
  ErrorCategory,
} from '../types/debugger';

const STORAGE_KEY = 'ai-debugger-history-v1';

function buildSeededHistory(): DebuggingHistoryItem[] {
  const py = SAMPLE_CASES[0];
  const js = SAMPLE_CASES[4];
  const java = SAMPLE_CASES[3];

  const pyResult: AnalysisResult = {
    id: 'seed-py-1',
    language: 'python',
    fileName: py.fileName,
    originalCode: py.code,
    fixedCode: `def add_score(score, scores=None):
    if scores is None:
        scores = []
    scores.append(score)
    return scores

def calculate_average(numbers):
    if not numbers:
        return 0.0
    total = sum(numbers)
    return total / len(numbers)

def find_duplicates(items):
    seen = set()
    duplicates = []
    for item in items:
        if item in seen and item not in duplicates:
            duplicates.append(item)
        seen.add(item)
    return duplicates

def print_status(score):
    if score == 100:
        print("Perfect score!")
    else:
        print(f"Final score: {score}")

grades = add_score(92)
print("Average:", calculate_average(grades))`,
    errors: [
      {
        id: 'seed-py-e1',
        type: 'Logical Error',
        severity: 'warning',
        line: 1,
        message: "Mutable default argument '[]' in function 'add_score'.",
        possibleCause: 'Default lists in Python are created once and shared across all function calls.',
        beginnerExplanation: 'Every time you call add_score(92) without a second argument, Python reuses the exact same list.',
        suggestedCorrection: 'Default scores=None and create a fresh list inside the function.',
        confidence: 96,
        source: 'Static Parser',
      },
      {
        id: 'seed-py-e2',
        type: 'Syntax Error',
        severity: 'critical',
        line: 5,
        message: "SyntaxError: expected ':' at the end of 'def' statement.",
        possibleCause: 'Missing colon after function parameter list.',
        beginnerExplanation: 'Python function headers must end with ":" so the interpreter knows an indented block follows.',
        suggestedCorrection: 'Add ":" after calculate_average(numbers).',
        confidence: 98,
        source: 'Static Parser',
      },
      {
        id: 'seed-py-e3',
        type: 'Runtime Error',
        severity: 'warning',
        line: 9,
        message: "Potential ZeroDivisionError when 'numbers' is empty.",
        possibleCause: 'len([]) evaluates to 0 on line 27.',
        beginnerExplanation: 'Passing an empty list to calculate_average([]) divides by zero and crashes.',
        suggestedCorrection: 'Return 0.0 early if numbers is empty.',
        confidence: 94,
        source: 'Static Parser',
      },
      {
        id: 'seed-py-e4',
        type: 'Performance Issue',
        severity: 'info',
        line: 14,
        message: 'Nested loop results in O(n²) quadratic time complexity.',
        possibleCause: 'Inner loop scans all items for every outer item.',
        beginnerExplanation: 'A Python set lets you check duplicates in one single pass.',
        suggestedCorrection: 'Track seen items with a set().',
        confidence: 87,
        source: 'Static Parser',
      },
    ],
    fixSteps: [
      {
        stepNumber: 1,
        line: 1,
        title: 'Replace mutable default list with None',
        description: 'Prevents shared state across repeated calls.',
        source: 'Static Parser',
      },
      {
        stepNumber: 2,
        line: 5,
        title: 'Add missing colon and empty check',
        description: 'Fixes SyntaxError and prevents ZeroDivisionError.',
        source: 'Static Parser',
      },
    ],
    learningTips: [
      'Use None instead of [] for optional list parameters in Python.',
      'Always check for empty collections before dividing by len().',
    ],
    summary: {
      totalErrors: 4,
      staticFindingsCount: 4,
      aiFindingsCount: 0,
      byCategory: {
        'Syntax Error': 1,
        'Runtime Error': 1,
        'Logical Error': 1,
        'Type Error': 0,
        'Name & Scope Error': 0,
        'Performance Issue': 1,
      },
      overallHealth: 'Critical Issues',
      analysisTimeMs: 18,
    },
    aiConfigured: false,
    analyzedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  };

  const jsResult: AnalysisResult = {
    id: 'seed-js-1',
    language: 'javascript',
    fileName: js.fileName,
    originalCode: js.code,
    fixedCode: `function calculateCartTotal(items, taxRate, discountCode = "") {
  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    subtotal += Number(items[i].price) * Number(items[i].qty);
  }
  if (discountCode === "SAVE10") {
    subtotal = subtotal * 0.9;
  }
  const numericTax = Number(taxRate);
  if (numericTax === 0) {
    return subtotal;
  }
  return Number((subtotal + numericTax).toFixed(2));
}`,
    errors: [
      {
        id: 'seed-js-e1',
        type: 'Type Error',
        severity: 'critical',
        line: 4,
        message: "Assignment to constant variable 'subtotal'.",
        possibleCause: "'subtotal' was declared with const on line 2.",
        beginnerExplanation: 'Variables declared with const cannot be reassigned inside a loop.',
        suggestedCorrection: 'Use let subtotal = 0.',
        confidence: 97,
        source: 'Static Parser',
      },
      {
        id: 'seed-js-e2',
        type: 'Runtime Error',
        severity: 'critical',
        line: 3,
        message: "Loop condition '<= items.length' accesses index out of bounds.",
        possibleCause: 'Last valid array index is items.length - 1.',
        beginnerExplanation: 'When i equals items.length, items[i] is undefined and reading .price throws a TypeError.',
        suggestedCorrection: 'Change <= to <.',
        confidence: 96,
        source: 'Static Parser',
      },
      {
        id: 'seed-js-e3',
        type: 'Name & Scope Error',
        severity: 'warning',
        line: 7,
        message: "Identifier 'discountCode' is used without being declared.",
        possibleCause: 'Missing parameter or local declaration.',
        beginnerExplanation: 'Declaring discountCode as a function parameter prevents ReferenceError.',
        suggestedCorrection: 'Add discountCode = "" to function parameters.',
        confidence: 92,
        source: 'Static Parser',
      },
    ],
    fixSteps: [
      {
        stepNumber: 1,
        line: 2,
        title: 'Change const subtotal to let subtotal',
        description: 'Enables accumulation across cart items.',
        source: 'Static Parser',
      },
    ],
    learningTips: [
      'Always use === for strict comparisons in JavaScript.',
      'Convert string inputs with Number() before arithmetic.',
    ],
    summary: {
      totalErrors: 3,
      staticFindingsCount: 3,
      aiFindingsCount: 0,
      byCategory: {
        'Syntax Error': 0,
        'Runtime Error': 1,
        'Logical Error': 0,
        'Type Error': 1,
        'Name & Scope Error': 1,
        'Performance Issue': 0,
      },
      overallHealth: 'Critical Issues',
      analysisTimeMs: 12,
    },
    aiConfigured: false,
    analyzedAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  };

  const javaResult: AnalysisResult = {
    id: 'seed-java-1',
    language: 'java',
    fileName: java.fileName,
    originalCode: java.code,
    fixedCode: `public class StudentRegistry {
    public static String findRole(String username) {
        String role = "Guest";
        if ("admin".equals(username)) {
            role = "Administrator";
        }
        return role.toUpperCase();
    }

    public static int sumScores(int[] scores) {
        int total = 0;
        for (int i = 0; i < scores.length; i++) {
            total += scores[i];
        }
        System.out.println("Total computed: " + total);
        return total;
    }

    public static void main(String[] args) {
        int[] marks = {88, 91, 76};
        System.out.println(findRole(new String("admin")));
        System.out.println(sumScores(marks));
    }
}`,
    errors: [
      {
        id: 'seed-java-e1',
        type: 'Logical Error',
        severity: 'critical',
        line: 4,
        message: "String comparison uses '==' instead of '.equals()'.",
        possibleCause: "'==' compares object references in Java.",
        beginnerExplanation: 'new String("admin") creates a distinct object, so == evaluates to false even when characters match.',
        suggestedCorrection: 'Use "admin".equals(username).',
        confidence: 98,
        source: 'Static Parser',
      },
      {
        id: 'seed-java-e2',
        type: 'Syntax Error',
        severity: 'critical',
        line: 10,
        message: "Missing return statement in method 'sumScores' returning 'int'.",
        possibleCause: 'Non-void method must return an int value.',
        beginnerExplanation: 'Add return total; before the closing brace of sumScores.',
        suggestedCorrection: 'Add return total;.',
        confidence: 97,
        source: 'Static Parser',
      },
    ],
    fixSteps: [
      {
        stepNumber: 1,
        line: 4,
        title: 'Compare Java Strings with .equals()',
        description: 'Ensures value equality instead of reference equality.',
        source: 'Static Parser',
      },
    ],
    learningTips: [
      'Always use .equals() for String content comparisons in Java.',
    ],
    summary: {
      totalErrors: 2,
      staticFindingsCount: 2,
      aiFindingsCount: 0,
      byCategory: {
        'Syntax Error': 1,
        'Runtime Error': 0,
        'Logical Error': 1,
        'Type Error': 0,
        'Name & Scope Error': 0,
        'Performance Issue': 0,
      },
      overallHealth: 'Critical Issues',
      analysisTimeMs: 14,
    },
    aiConfigured: false,
    analyzedAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
  };

  return [
    {
      id: pyResult.id,
      language: 'python',
      fileName: pyResult.fileName,
      analyzedAt: pyResult.analyzedAt,
      errorCount: pyResult.errors.length,
      staticCount: pyResult.summary.staticFindingsCount,
      aiCount: pyResult.summary.aiFindingsCount,
      topCategory: 'Syntax Error',
      result: pyResult,
      isSample: true,
    },
    {
      id: jsResult.id,
      language: 'javascript',
      fileName: jsResult.fileName,
      analyzedAt: jsResult.analyzedAt,
      errorCount: jsResult.errors.length,
      staticCount: jsResult.summary.staticFindingsCount,
      aiCount: jsResult.summary.aiFindingsCount,
      topCategory: 'Type Error',
      result: jsResult,
      isSample: true,
    },
    {
      id: javaResult.id,
      language: 'java',
      fileName: javaResult.fileName,
      analyzedAt: javaResult.analyzedAt,
      errorCount: javaResult.errors.length,
      staticCount: javaResult.summary.staticFindingsCount,
      aiCount: javaResult.summary.aiFindingsCount,
      topCategory: 'Logical Error',
      result: javaResult,
      isSample: true,
    },
  ];
}

export function loadDebuggingHistory(): DebuggingHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = buildSeededHistory();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore storage read failure
  }
  return buildSeededHistory();
}

export function getTopCategory(result: AnalysisResult): ErrorCategory | 'None' {
  let top: ErrorCategory | 'None' = 'None';
  let max = 0;
  for (const [cat, count] of Object.entries(result.summary.byCategory)) {
    if (count > max) {
      max = count;
      top = cat as ErrorCategory;
    }
  }
  return top;
}

export function saveReportToHistory(
  result: AnalysisResult,
  existing: DebuggingHistoryItem[]
): DebuggingHistoryItem[] {
  const newItem: DebuggingHistoryItem = {
    id: result.id,
    language: result.language,
    fileName: result.fileName,
    analyzedAt: result.analyzedAt,
    errorCount: result.summary.totalErrors,
    staticCount: result.summary.staticFindingsCount,
    aiCount: result.summary.aiFindingsCount,
    topCategory: getTopCategory(result),
    result,
    isSample: false,
  };
  const updated = [newItem, ...existing.filter((item) => item.id !== result.id)].slice(0, 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
  return updated;
}

export function deleteHistoryItem(
  id: string,
  existing: DebuggingHistoryItem[]
): DebuggingHistoryItem[] {
  const updated = existing.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function clearAllHistory(): DebuggingHistoryItem[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch {
    // ignore
  }
  return [];
}
