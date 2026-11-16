import { ArrowRight, Bug, FileCode2, ShieldCheck, Sparkles } from 'lucide-react';
import { LANGUAGE_META, SAMPLE_CASES } from '../data/samples';
import type {
  DebuggingHistoryItem,
  ErrorCategory,
  SampleCase,
} from '../types/debugger';

interface HomeDashboardProps {
  history: DebuggingHistoryItem[];
  aiConfigured: boolean | null;
  onStartDebugging: () => void;
  onLoadSample: (sample: SampleCase) => void;
  onReopenReport: (item: DebuggingHistoryItem) => void;
  onViewAllHistory: () => void;
}

const ALL_CATEGORIES: ErrorCategory[] = [
  'Syntax Error',
  'Runtime Error',
  'Logical Error',
  'Type Error',
  'Name & Scope Error',
  'Performance Issue',
];

const CATEGORY_BAR_STYLES: Record<ErrorCategory, string> = {
  'Syntax Error': 'bg-rose-500',
  'Runtime Error': 'bg-amber-500',
  'Logical Error': 'bg-purple-500',
  'Type Error': 'bg-blue-500',
  'Name & Scope Error': 'bg-sky-400',
  'Performance Issue': 'bg-emerald-500',
};

export function HomeDashboard({
  history,
  aiConfigured,
  onStartDebugging,
  onLoadSample,
  onReopenReport,
  onViewAllHistory,
}: HomeDashboardProps) {
  const totalCodesAnalyzed = history.length;
  const totalErrorsDetected = history.reduce((acc, h) => acc + h.errorCount, 0);
  const totalStatic = history.reduce((acc, h) => acc + h.staticCount, 0);
  const totalAi = history.reduce((acc, h) => acc + h.aiCount, 0);

  const categoryTotals: Record<ErrorCategory, number> = {
    'Syntax Error': 0,
    'Runtime Error': 0,
    'Logical Error': 0,
    'Type Error': 0,
    'Name & Scope Error': 0,
    'Performance Issue': 0,
  };

  for (const item of history) {
    for (const cat of ALL_CATEGORIES) {
      categoryTotals[cat] += item.result.summary.byCategory[cat] ?? 0;
    }
  }

  let topCategoryLabel: string = 'None yet';
  let topCategoryCount = 0;
  for (const cat of ALL_CATEGORIES) {
    if (categoryTotals[cat] > topCategoryCount) {
      topCategoryCount = categoryTotals[cat];
      topCategoryLabel = cat;
    }
  }

  const maxCatCount = Math.max(1, ...Object.values(categoryTotals));
  const recentHistory = history.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Hero / Welcome Section */}
      <section className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-xs font-medium text-blue-400">
              <Bug className="h-4 w-4" aria-hidden="true" />
              <span>AI Debugger · Intelligent Source Code Error Analysis System</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 text-balance">
              Inspect source code safely, classify every bug, and review beginner-friendly fixes.
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300">
              Combine deterministic static language parsers with AI-assisted semantic diagnostics across Python, C, C++, Java, and JavaScript. Submitted code is analyzed statically and never executed on the server.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                Zero server-side code execution
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-400" aria-hidden="true" />
                {aiConfigured === true
                  ? 'Static Parsers + Gemini AI Active'
                  : 'Static Parsers + Heuristic Fallback Ready'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartDebugging}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap shrink-0"
            >
              <span>Start Debugging</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Tabular KPI Strip */}
      <section aria-label="Debugging Statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-5">
          <p className="text-xs font-medium text-slate-400">Total Codes Analyzed</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-50">
            {totalCodesAnalyzed}
          </p>
          <p className="mt-1 text-xs text-slate-400">Saved locally across 5 languages</p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-5">
          <p className="text-xs font-medium text-slate-400">Errors Detected</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-rose-400">
            {totalErrorsDetected}
          </p>
          <p className="mt-1 text-xs text-slate-400">Across syntax, runtime, and logic</p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-5">
          <p className="text-xs font-medium text-slate-400">Detection Breakdown</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-blue-400">
            {totalStatic} <span className="text-sm font-normal text-slate-400">Static</span>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-purple-400">{totalAi}</span>{' '}
            <span className="text-sm font-normal text-slate-400">AI</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Transparent origin tracking</p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-5">
          <p className="text-xs font-medium text-slate-400">Most Frequent Category</p>
          <p className="mt-2 font-display text-xl font-semibold text-slate-100 truncate">
            {topCategoryLabel}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-slate-400">
            {topCategoryCount} recorded findings
          </p>
        </div>
      </section>

      {/* Main 2-Column Content: Error Classification Breakdown + Recent Debugging History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Error Classification Statistics */}
        <section className="lg:col-span-5 rounded-xl border border-slate-800/90 bg-[#0B1120] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Error Classification Statistics
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Distribution of issues identified across analyzed reports.
            </p>

            <div className="mt-5 space-y-4">
              {ALL_CATEGORIES.map((category) => {
                const count = categoryTotals[category];
                const pct = Math.round((count / maxCatCount) * 100);
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{category}</span>
                      <span className="font-mono tabular-nums text-slate-400">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${CATEGORY_BAR_STYLES[category]}`}
                        style={{ width: `${count === 0 ? 0 : Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
            Static parser checks run deterministically before AI review to separate guaranteed syntax facts from semantic suggestions.
          </div>
        </section>

        {/* Recent Debugging History */}
        <section className="lg:col-span-7 rounded-xl border border-slate-800/90 bg-[#0B1120] p-6 flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                Recent Debugging History
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Reopen any saved analysis to inspect faulty lines and side-by-side fixes.
              </p>
            </div>
            <button
              type="button"
              onClick={onViewAllHistory}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap shrink-0"
            >
              View All History
            </button>
          </div>

          {recentHistory.length === 0 ? (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 p-8 text-center">
              <p className="text-sm font-medium text-slate-300">No debugging reports saved yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Analyze a code snippet or load one of the sample test cases below.
              </p>
              <button
                type="button"
                onClick={onStartDebugging}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Open Code Analyzer
              </button>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                    <th className="py-2.5 pr-4">File</th>
                    <th className="py-2.5 pr-4">Language</th>
                    <th className="py-2.5 pr-4 text-right">Errors</th>
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {recentHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-mono text-xs font-medium text-slate-100">
                          {item.fileName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.topCategory}
                          {item.isSample ? ' · Sample' : ''}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs font-medium text-slate-300 whitespace-nowrap">
                        {LANGUAGE_META[item.language].label}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums">
                        <span className={item.errorCount > 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                          {item.errorCount}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs tabular-nums text-slate-400 whitespace-nowrap">
                        {new Date(item.analyzedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onReopenReport(item)}
                          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500/60 hover:text-blue-300 transition-colors whitespace-nowrap"
                        >
                          Reopen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Interactive Sample Test Cases */}
      <section className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Sample Test Cases Across All 5 Supported Languages
            </h2>
            <p className="text-xs text-slate-400">
              Load and analyze pre-built buggy programs immediately to inspect error detection, explanations, and diff fixes.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {SAMPLE_CASES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onLoadSample(sample)}
              className="group flex flex-col justify-between rounded-lg border border-slate-800 bg-[#070B16] p-4 text-left transition-colors hover:border-blue-500/60 hover:bg-[#0D1426] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="font-medium text-blue-400">
                    {LANGUAGE_META[sample.language].label}
                  </span>
                  <FileCode2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400" aria-hidden="true" />
                </div>
                <h3 className="mt-2 font-display text-sm font-semibold text-slate-100">
                  {sample.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {sample.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs font-medium text-purple-400 group-hover:text-purple-300">
                <span className="font-mono text-[11px] text-slate-500 truncate">{sample.fileName}</span>
                <span className="whitespace-nowrap shrink-0">Analyze →</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
