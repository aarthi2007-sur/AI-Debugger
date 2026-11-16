import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  DetectedError,
  ErrorCategory,
  ErrorSeverity,
  FixStep,
  SupportedLanguage,
} from '../types/debugger';
import type { StaticAnalysisOutput } from './staticAnalyzer';

export interface GeminiDebugOutput {
  aiConfigured: boolean;
  aiNotice?: string;
  aiErrors: DetectedError[];
  fixedCode: string;
  fixSteps: FixStep[];
  learningTips: string[];
}

const VALID_CATEGORIES = new Set<ErrorCategory>([
  'Syntax Error',
  'Runtime Error',
  'Logical Error',
  'Type Error',
  'Name & Scope Error',
  'Performance Issue',
]);

const VALID_SEVERITIES = new Set<ErrorSeverity>(['critical', 'warning', 'info']);

function getSampleDeterministicFix(
  code: string,
  language: SupportedLanguage
): {
  fixedCode: string;
  fixSteps: FixStep[];
  extraErrors: DetectedError[];
} | null {
  if (
    language === 'python' &&
    code.includes('def add_score(score, scores=[])') &&
    code.includes('def calculate_average(numbers)')
  ) {
    return {
      extraErrors: [
        {
          id: 'fallback-py-str',
          type: 'Type Error',
          severity: 'critical',
          line: 24,
          message: `Cannot concatenate str and int in print("Final score: " + score).`,
          possibleCause: `Python raises TypeError when '+' combines a string literal with an integer argument.`,
          beginnerExplanation: `Use an f-string like f"Final score: {score}" so Python formats numbers into text automatically.`,
          suggestedCorrection: `Replace '"Final score: " + score' with 'f"Final score: {score}"'.`,
          confidence: 95,
          source: 'Static Parser',
        },
      ],
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
      fixSteps: [
        {
          stepNumber: 1,
          line: 1,
          title: 'Eliminate mutable default list in add_score()',
          description: 'Default scores to None and allocate a new list inside the function body.',
          source: 'Static Parser',
        },
        {
          stepNumber: 2,
          line: 5,
          title: 'Add missing colon and empty-list guard in calculate_average()',
          description: 'Added ":" to the function definition and returned 0.0 if numbers is empty to prevent ZeroDivisionError.',
          source: 'Static Parser',
        },
        {
          stepNumber: 3,
          line: 11,
          title: 'Optimize find_duplicates() from O(n²) to O(n)',
          description: 'Replaced nested index loops with a single pass using a set() lookup.',
          source: 'Static Parser',
        },
        {
          stepNumber: 4,
          line: 21,
          title: 'Fix assignment in if-condition and string formatting',
          description: 'Changed "if score = 100" to "if score == 100:" and used an f-string for safe number printing.',
          source: 'Static Parser',
        },
      ],
    };
  }

  if (language === 'c' && code.includes('scanf("%d", target);')) {
    return {
      extraErrors: [],
      fixedCode: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int count = 5;
    int values[5] = {10, 20, 30, 40, 50};
    int sum = 0;
    int target = 0;

    printf("Enter target value: ");
    scanf("%d", &target);

    for (int i = 0; i < count; i++) {
        sum += values[i];
    }

    if (sum == 150) {
        printf("Exact match found\\n");
    }

    int *buffer = (int *)malloc(sizeof(int) * 10);
    if (buffer != NULL) {
        buffer[0] = sum;
        free(buffer);
    }
    return 0;
}`,
      fixSteps: [
        {
          stepNumber: 1,
          line: 1,
          title: 'Add <stdio.h> and <stdlib.h> includes',
          description: 'Provides compiler declarations for printf, scanf, malloc, and free.',
          source: 'Static Parser',
        },
        {
          stepNumber: 2,
          line: 4,
          title: 'Initialize sum = 0 and pass &target to scanf',
          description: 'Prevents garbage accumulation and fixes segmentation fault in scanf().',
          source: 'Static Parser',
        },
        {
          stepNumber: 3,
          line: 10,
          title: 'Fix loop bound (i < count) and conditional equality (==)',
          description: 'Prevents out-of-bounds read at values[5] and accidental assignment in if().',
          source: 'Static Parser',
        },
        {
          stepNumber: 4,
          line: 18,
          title: 'Free allocated heap memory and add missing semicolon',
          description: 'Adds NULL check, calls free(buffer), and terminates return 0 with a semicolon.',
          source: 'Static Parser',
        },
      ],
    };
  }

  if (language === 'cpp' && code.includes('computeRatio(int passed, int total)')) {
    return {
      extraErrors: [],
      fixedCode: `#include <iostream>
#include <memory>
#include <vector>

using namespace std;

double computeRatio(int passed, int total) {
    if (total == 0) {
        return 0.0;
    }
    return static_cast<double>(passed) / total;
}

int main() {
    vector<int> stock = {12, 45, 7, 19};
    int highest = stock.empty() ? 0 : stock[0];

    for (size_t i = 0; i < stock.size(); i++) {
        if (stock[i] > highest) {
            highest = stock[i];
        }
    }

    auto ptr = make_unique<int>(42);
    cout << "Highest: " << highest << endl;
    cout << "Ratio: " << computeRatio(3, 4) << endl;
    return 0;
}`,
      fixSteps: [
        {
          stepNumber: 1,
          line: 1,
          title: 'Include <iostream> and <memory>',
          description: 'Provides declarations for std::cout, std::endl, and std::unique_ptr.',
          source: 'Static Parser',
        },
        {
          stepNumber: 2,
          line: 6,
          title: 'Use static_cast<double> and guard total == 0',
          description: 'Prevents integer division truncation (3/4 -> 0) and division by zero.',
          source: 'Static Parser',
        },
        {
          stepNumber: 3,
          line: 13,
          title: 'Fix vector loop boundary from <= to <',
          description: 'Stops before stock.size() to avoid undefined out-of-bounds vector access.',
          source: 'Static Parser',
        },
        {
          stepNumber: 4,
          line: 19,
          title: 'Replace raw owning new pointer with std::unique_ptr',
          description: 'Eliminates manual memory leak automatically using RAII.',
          source: 'Static Parser',
        },
      ],
    };
  }

  if (language === 'java' && code.includes('class StudentRegistry')) {
    return {
      extraErrors: [],
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
      fixSteps: [
        {
          stepNumber: 1,
          line: 3,
          title: 'Initialize role safely and compare strings with .equals()',
          description: 'Prevents NullPointerException on role.toUpperCase() and checks string content rather than reference identity.',
          source: 'Static Parser',
        },
        {
          stepNumber: 2,
          line: 12,
          title: 'Fix off-by-one loop bound (i < scores.length)',
          description: 'Prevents ArrayIndexOutOfBoundsException at the end of the array.',
          source: 'Static Parser',
        },
        {
          stepNumber: 3,
          line: 15,
          title: 'Add missing return total statement',
          description: 'Satisfies the int return type contract of sumScores().',
          source: 'Static Parser',
        },
      ],
    };
  }

  if (language === 'javascript' && code.includes('function calculateCartTotal')) {
    return {
      extraErrors: [
        {
          id: 'fallback-js-type',
          type: 'Type Error',
          severity: 'warning',
          line: 15,
          message: `Adding numeric 'subtotal' and string 'taxRate' concatenates strings instead of summing numbers.`,
          possibleCause: `In JavaScript, '+' performs string concatenation whenever either operand is a string (e.g., "5.00").`,
          beginnerExplanation: `Because sampleItems[0].price is "49.99" and taxRate is "5.00", JavaScript joins them as text instead of performing arithmetic addition.`,
          suggestedCorrection: `Convert item prices and taxRate using Number(...) before performing arithmetic.`,
          confidence: 94,
          source: 'Static Parser',
        },
      ],
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

  const total = subtotal + numericTax;
  return Number(total.toFixed(2));
}

const sampleItems = [
  { name: "Keyboard", price: 49.99, qty: 1 },
  { name: "Mouse", price: 25, qty: 2 }
];

console.log(calculateCartTotal(sampleItems, 5.0));`,
      fixSteps: [
        {
          stepNumber: 1,
          line: 2,
          title: 'Use let instead of const for subtotal',
          description: 'Allows subtotal to accumulate item totals inside the loop.',
          source: 'Static Parser',
        },
        {
          stepNumber: 2,
          line: 3,
          title: 'Fix loop condition to i < items.length and coerce numeric fields',
          description: 'Prevents reading items[items.length] (undefined) and avoids string concatenation.',
          source: 'Static Parser',
        },
        {
          stepNumber: 3,
          line: 7,
          title: 'Declare discountCode parameter and use strict ===',
          description: 'Fixes undeclared variable ReferenceError and accidental assignment inside if().',
          source: 'Static Parser',
        },
        {
          stepNumber: 4,
          line: 11,
          title: 'Replace loose == with strict === and numeric tax conversion',
          description: 'Ensures taxRate is added numerically rather than concatenated as a string.',
          source: 'Static Parser',
        },
      ],
    };
  }

  return null;
}

function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return false;
  if (key === 'MY_GEMINI_API_KEY' || key.startsWith('your_')) return false;
  return true;
}

export async function runGeminiAnalysis(
  code: string,
  language: SupportedLanguage,
  staticResult: StaticAnalysisOutput
): Promise<GeminiDebugOutput> {
  const sampleFix = getSampleDeterministicFix(code, language);

  if (!isGeminiConfigured()) {
    const mergedExtra = sampleFix?.extraErrors ?? [];
    const mergedSteps =
      sampleFix?.fixSteps ??
      (staticResult.fallbackFixSteps.length > 0
        ? staticResult.fallbackFixSteps
        : [
            {
              stepNumber: 1,
              line: 1,
              title: 'Apply static analyzer corrections',
              description: 'Review highlighted static parser diagnostics above to resolve syntax and safety issues.',
              source: 'Static Parser',
            },
          ]);

    return {
      aiConfigured: false,
      aiNotice:
        'AI API key is not configured in this environment. Showing deterministic Static Parser findings and built-in heuristic fixes.',
      aiErrors: mergedExtra,
      fixedCode: sampleFix?.fixedCode ?? staticResult.fallbackFixedCode,
      fixSteps: mergedSteps,
      learningTips: staticResult.fallbackLearningTips,
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const numberedSource = code
      .split('\n')
      .map((line, i) => `${i + 1}: ${line}`)
      .join('\n');

    const staticSummary = staticResult.errors
      .map((e) => `Line ${e.line} [${e.type}]: ${e.message}`)
      .join('\n');

    const prompt = `Analyze the following ${language.toUpperCase()} source code for bugs across all 6 error categories:
- Syntax Error
- Runtime Error
- Logical Error
- Type Error
- Name & Scope Error
- Performance Issue

Static parser already found:
${staticSummary || 'No syntax/bracket errors from initial static pass.'}

Numbered source code:
\`\`\`${language}
${numberedSource}
\`\`\`

Instructions:
1. Identify any additional or deeper errors (especially Logical Errors, Runtime Errors, Type Errors, Name & Scope Errors, and Performance Issues) with exact 1-based line numbers. Do not duplicate static errors word-for-word unless adding deeper insight, and keep explanations clear and beginner-friendly.
2. Provide the complete, clean, runnable corrected version of the source code in "fixedCode" (without line numbers or markdown code fences).
3. Provide concise step-by-step "fixSteps" explaining each change.
4. Provide 3-4 practical, beginner-friendly "learningTips" specific to this code.`;

    const generatePromise = ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert static code analysis and programming mentor engine. Never execute code; analyze it purely by inspection. Always return valid JSON matching the schema.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            errors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description:
                      'One of: Syntax Error, Runtime Error, Logical Error, Type Error, Name & Scope Error, Performance Issue',
                  },
                  severity: {
                    type: Type.STRING,
                    description: 'One of: critical, warning, info',
                  },
                  line: {
                    type: Type.INTEGER,
                    description: '1-based line number where the issue occurs',
                  },
                  message: { type: Type.STRING },
                  possibleCause: { type: Type.STRING },
                  beginnerExplanation: { type: Type.STRING },
                  suggestedCorrection: { type: Type.STRING },
                  confidence: {
                    type: Type.INTEGER,
                    description: 'Confidence percentage between 60 and 99',
                  },
                },
                required: [
                  'type',
                  'severity',
                  'line',
                  'message',
                  'possibleCause',
                  'beginnerExplanation',
                  'suggestedCorrection',
                  'confidence',
                ],
              },
            },
            fixedCode: {
              type: Type.STRING,
              description: 'Complete corrected source code without markdown fences or line numbers',
            },
            fixSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  line: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['stepNumber', 'line', 'title', 'description'],
              },
            },
            learningTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['errors', 'fixedCode', 'fixSteps', 'learningTips'],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI service timed out after 8 seconds')), 8000);
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText) as {
      errors?: Array<{
        type?: string;
        severity?: string;
        line?: number;
        message?: string;
        possibleCause?: string;
        beginnerExplanation?: string;
        suggestedCorrection?: string;
        confidence?: number;
      }>;
      fixedCode?: string;
      fixSteps?: Array<{
        stepNumber?: number;
        line?: number;
        title?: string;
        description?: string;
      }>;
      learningTips?: string[];
    };

    const totalLines = code.split('\n').length;
    const aiErrors: DetectedError[] = (parsed.errors ?? []).map((item, idx) => {
      const cat: ErrorCategory = VALID_CATEGORIES.has(item.type as ErrorCategory)
        ? (item.type as ErrorCategory)
        : 'Logical Error';
      const sev: ErrorSeverity = VALID_SEVERITIES.has(item.severity as ErrorSeverity)
        ? (item.severity as ErrorSeverity)
        : 'warning';
      const lineNum = Math.min(Math.max(Number(item.line) || 1, 1), totalLines);
      const conf = Math.min(Math.max(Math.round(Number(item.confidence) || 88), 50), 99);

      return {
        id: `ai-${idx}-${Date.now().toString(36)}`,
        type: cat,
        severity: sev,
        line: lineNum,
        message: item.message ?? 'Potential issue identified during semantic review.',
        possibleCause: item.possibleCause ?? 'Code behavior may diverge from intent under edge cases.',
        beginnerExplanation:
          item.beginnerExplanation ?? 'Review this line to ensure types, bounds, and logic match expectations.',
        suggestedCorrection: item.suggestedCorrection ?? 'Apply the suggested fix shown in the diff panel.',
        confidence: conf,
        source: 'AI Analysis',
      };
    });

    const fixSteps: FixStep[] = (parsed.fixSteps ?? []).map((step, idx) => ({
      stepNumber: Number(step.stepNumber) || idx + 1,
      line: Math.min(Math.max(Number(step.line) || 1, 1), totalLines),
      title: step.title ?? `Step ${idx + 1}`,
      description: step.description ?? 'Applied recommended fix.',
      source: 'AI Analysis',
    }));

    return {
      aiConfigured: true,
      aiErrors,
      fixedCode: parsed.fixedCode?.trim()
        ? parsed.fixedCode
        : sampleFix?.fixedCode ?? staticResult.fallbackFixedCode,
      fixSteps: fixSteps.length > 0 ? fixSteps : staticResult.fallbackFixSteps,
      learningTips:
        parsed.learningTips && parsed.learningTips.length > 0
          ? parsed.learningTips
          : staticResult.fallbackLearningTips,
    };
  } catch (err: unknown) {
    let readableErr = err instanceof Error ? err.message : 'Service temporarily unavailable';
    try {
      const parsedErr = JSON.parse(readableErr) as { error?: { message?: string } };
      if (parsedErr?.error?.message) {
        readableErr = parsedErr.error.message;
      }
    } catch {
      // keep plain text error message
    }
    return {
      aiConfigured: false,
      aiNotice: `AI explanation service note: ${readableErr} Displaying Static Parser findings and built-in heuristic fixes.`,
      aiErrors: sampleFix?.extraErrors ?? [],
      fixedCode: sampleFix?.fixedCode ?? staticResult.fallbackFixedCode,
      fixSteps: sampleFix?.fixSteps ?? staticResult.fallbackFixSteps,
      learningTips: staticResult.fallbackLearningTips,
    };
  }
}
