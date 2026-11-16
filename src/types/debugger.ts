export type SupportedLanguage = 'python' | 'c' | 'cpp' | 'java' | 'javascript';

export type ErrorCategory =
  | 'Syntax Error'
  | 'Runtime Error'
  | 'Logical Error'
  | 'Type Error'
  | 'Name & Scope Error'
  | 'Performance Issue';

export type AnalysisOrigin = 'Static Parser' | 'AI Analysis';

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface DetectedError {
  id: string;
  type: ErrorCategory;
  severity: ErrorSeverity;
  line: number;
  column?: number;
  message: string;
  possibleCause: string;
  beginnerExplanation: string;
  suggestedCorrection: string;
  confidence: number; // 0-100
  source: AnalysisOrigin;
}

export interface FixStep {
  stepNumber: number;
  line: number;
  title: string;
  description: string;
  source: AnalysisOrigin;
}

export interface AnalysisSummary {
  totalErrors: number;
  staticFindingsCount: number;
  aiFindingsCount: number;
  byCategory: Record<ErrorCategory, number>;
  overallHealth: 'Clean' | 'Needs Review' | 'Critical Issues';
  analysisTimeMs: number;
}

export interface AnalysisResult {
  id: string;
  language: SupportedLanguage;
  fileName: string;
  originalCode: string;
  fixedCode: string;
  errors: DetectedError[];
  fixSteps: FixStep[];
  learningTips: string[];
  summary: AnalysisSummary;
  aiConfigured: boolean;
  aiNotice?: string;
  analyzedAt: string;
}

export interface DebuggingHistoryItem {
  id: string;
  language: SupportedLanguage;
  fileName: string;
  analyzedAt: string;
  errorCount: number;
  staticCount: number;
  aiCount: number;
  topCategory: ErrorCategory | 'None';
  result: AnalysisResult;
  isSample?: boolean;
}

export interface SampleCase {
  id: string;
  title: string;
  language: SupportedLanguage;
  fileName: string;
  description: string;
  code: string;
  expectedErrorTypes: ErrorCategory[];
}
