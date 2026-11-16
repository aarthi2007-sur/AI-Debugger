import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  GitCompare,
  Info,
  Lightbulb,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type {
  AnalysisOrigin,
  AnalysisResult,
  DetectedError,
  ErrorCategory,
} from '../types/debugger';
import { downloadDebuggingReportMarkdown } from '../utils/reportExport';

interface ErrorResultsPanelProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  highlightedLine: number | null;
  onSelectLine: (line: number) => void;
  onOpenFixDiff: () => void;
}

const CATEGORIES: Array<'All' | ErrorCategory> = [
  'All',
  'Syntax Error',
  'Runtime Error',
  'Logical Error',
  'Type Error',
  'Name & Scope Error',
  'Performance Issue',
];

const ORIGINS: Array<'All' | AnalysisOrigin> = ['All', 'Static Parser', 'AI Analysis'];

function getSeverityTextStyle(severity: DetectedError['severity']): string {
  switch (severity) {
    case 'critical':
      return 'text-rose-400';
    case 'warning':
      return 'text-amber-400';
    case 'info':
      return 'text-blue-400';
  }
}

export function ErrorResultsPanel({
  result,
  isAnalyzing,
  highlightedLine,
  onSelectLine,
  onOpenFixDiff,
}: ErrorResultsPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<'All' | ErrorCategory>('All');
  const [originFilter, setOriginFilter] = useState<'All' | AnalysisOrigin>('All');

  if (isAnalyzing) {
    return (
      <section className="flex flex-col rounded-xl border border-slate-800/90 bg-[#0B1120] p-6 min-h-[580px]">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Analyzing Source Code...
            </h2>
            <p className="text-xs text-slate-400">
              Running language-specific static parser checks and generating diagnostic explanations.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-lg border border-slate-800 bg-[#070B16] p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-36 rounded bg-slate-800" />
                <div className="h-3.5 w-16 rounded bg-slate-800" />
              </div>
              <div className="h-4 w-5/6 rounded bg-slate-800/90" />
              <div className="h-3 w-full rounded bg-slate-800/70" />
              <div className="h-3 w-4/5 rounded bg-slate-800/70" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="flex flex-col items-center justify-center rounded-xl border border-slate-800/90 bg-[#0B1120] p-8 text-center min-h-[580px]">
        <Cpu className="h-10 w-10 text-blue-400" aria-hidden="true" />
        <h2 className="mt-4 font-display text-lg font-semibold text-slate-100">
          Ready for Code Inspection
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          Paste or upload your Python, C, C++, Java, or JavaScript code in the editor and click <strong className="text-slate-200">Analyze Code</strong> to detect syntax, runtime, logical, type, scope, and performance issues.
        </p>
      </section>
    );
  }

  const filteredErrors = result.errors.filter((err) => {
    const matchesCat = categoryFilter === 'All' || err.type === categoryFilter;
    const matchesOrigin = originFilter === 'All' || err.source === originFilter;
    return matchesCat && matchesOrigin;
  });

  return (
    <section className="flex flex-col rounded-xl border border-slate-800/90 bg-[#0B1120] overflow-hidden">
      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-[#090E1C] px-5 py-3.5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100">
            Error Analysis Results
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono tabular-nums text-slate-200">
              {result.summary.totalErrors} {result.summary.totalErrors === 1 ? 'issue' : 'issues'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-blue-400">
              {result.summary.staticFindingsCount} Static Parser
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-purple-400">
              {result.summary.aiFindingsCount} AI Analysis
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {result.summary.analysisTimeMs}ms
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadDebuggingReportMarkdown(result)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060913] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-900 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
            <span>Download Report</span>
          </button>

          <button
            type="button"
            onClick={onOpenFixDiff}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors whitespace-nowrap shrink-0"
          >
            <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Review Side-by-Side Fix</span>
          </button>
        </div>
      </div>

      {/* Explicit Static vs AI Notice */}
      {result.aiNotice && (
        <div className="flex items-start gap-2.5 border-b border-slate-800/80 bg-[#070B16] px-5 py-3 text-xs text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
          <span>{result.aiNotice}</span>
        </div>
      )}

      {/* Interactive Filters */}
      <div className="space-y-2.5 border-b border-slate-800/80 bg-[#080C18] px-5 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {ORIGINS.map((orig) => (
            <button
              key={orig}
              type="button"
              onClick={() => setOriginFilter(orig)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                originFilter === orig
                  ? 'bg-slate-800 text-slate-50 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {orig === 'All' ? 'All Sources' : orig}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const count =
              cat === 'All' ? result.errors.length : result.summary.byCategory[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {cat} <span className="ml-1 font-mono tabular-nums opacity-75">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Diagnostic List */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5 max-h-[600px]">
        {filteredErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-[#070B16] p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-100">
              {result.errors.length === 0
                ? 'No errors detected in this source file'
                : 'No errors match the active filter'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {result.errors.length === 0
                ? 'Both the static parser and analysis pass reported clean code.'
                : 'Try resetting the category or source filter above.'}
            </p>
          </div>
        ) : (
          filteredErrors.map((err) => {
            const isSelected = highlightedLine === err.line;
            return (
              <article
                key={err.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isSelected
                    ? 'border-blue-500/70 bg-[#0E162B]'
                    : 'border-slate-800 bg-[#070B16] hover:border-slate-700'
                }`}
              >
                {/* Top Metadata Row (Zero-Pill Unboxed Text + Separators) */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${getSeverityTextStyle(err.severity)}`}>
                      {err.severity === 'critical' ? (
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : err.severity === 'warning' ? (
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{err.type}</span>
                    </span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => onSelectLine(err.line)}
                      className="font-mono font-medium tabular-nums text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    >
                      Line {err.line}{err.column ? `:${err.column}` : ''}
                    </button>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        err.source === 'AI Analysis' ? 'text-purple-400' : 'text-sky-400'
                      }`}
                    >
                      {err.source === 'AI Analysis' && (
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                      )}
                      {err.source}
                    </span>
                  </div>

                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    Confidence {err.confidence}%
                  </span>
                </div>

                {/* Error Message */}
                <h3 className="mt-2.5 font-mono text-sm font-semibold text-slate-100">
                  {err.message}
                </h3>

                {/* Detailed Breakdown Grid */}
                <dl className="mt-3 space-y-2 text-xs leading-relaxed">
                  <div>
                    <dt className="font-semibold text-slate-400">Possible Cause</dt>
                    <dd className="mt-0.5 text-slate-200">{err.possibleCause}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-400">Beginner-Friendly Explanation</dt>
                    <dd className="mt-0.5 text-slate-300">{err.beginnerExplanation}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-emerald-400">Suggested Correction</dt>
                    <dd className="mt-0.5 text-slate-200">{err.suggestedCorrection}</dd>
                  </div>
                </dl>
              </article>
            );
          })
        )}

        {/* Beginner-Friendly Learning Tips */}
        {result.learningTips.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-[#080D1B] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              <span>Beginner-Friendly Learning Tips</span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-slate-300 list-disc pl-4">
              {result.learningTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
