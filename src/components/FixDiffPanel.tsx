import { ArrowLeft, Check, Copy, Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AnalysisResult } from '../types/debugger';
import { downloadDebuggingReportMarkdown } from '../utils/reportExport';
import {
  computeSideBySideDiff,
  TOKEN_CLASSES,
  tokenizeLine,
} from '../utils/syntaxHighlight';

interface FixDiffPanelProps {
  result: AnalysisResult;
  onApplyFix: (fixedCode: string, reanalyzeAfter: boolean) => void;
  onBackToAnalyzer: () => void;
}

export function FixDiffPanel({
  result,
  onApplyFix,
  onBackToAnalyzer,
}: FixDiffPanelProps) {
  const [copied, setCopied] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const diffRows = useMemo(
    () => computeSideBySideDiff(result.originalCode, result.fixedCode),
    [result.originalCode, result.fixedCode]
  );

  const faultyLineSet = useMemo(
    () => new Set(result.errors.map((e) => e.line)),
    [result.errors]
  );

  const changedCount = useMemo(
    () => diffRows.filter((r) => r.status !== 'unchanged').length,
    [diffRows]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.fixedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy unavailable in restricted frames
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800/90 bg-[#0B1120] px-5 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToAnalyzer}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060913] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Analyzer</span>
          </button>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-50">
              Side-by-Side Fix Suggestion
            </h1>
            <p className="text-xs text-slate-400">
              <span className="font-mono text-slate-200">{result.fileName}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{changedCount} changed lines</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Review carefully before applying</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060913] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-blue-500/50 hover:text-blue-300 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-300">Copied Fixed Code</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                <span>Copy Fixed Code</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => downloadDebuggingReportMarkdown(result)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060913] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
            <span>Export Report</span>
          </button>
        </div>
      </section>

      {/* Side-by-Side Diff Viewer */}
      <section className="rounded-xl border border-slate-800/90 bg-[#0B1120] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-slate-800/90 bg-[#090E1C] text-xs font-semibold">
          <div className="px-4 py-2.5 text-rose-300 border-b lg:border-b-0 lg:border-r border-slate-800/90">
            Original Code (Faulty lines highlighted)
          </div>
          <div className="px-4 py-2.5 text-emerald-300">
            Suggested Corrected Code
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto bg-[#060913] font-mono text-[12.5px] leading-[21px]">
          <div className="min-w-[820px]">
            {diffRows.map((row, idx) => {
              const isFaultyLeft =
                row.leftLineNum !== null && faultyLineSet.has(row.leftLineNum);
              const leftBg =
                row.status === 'removed' || row.status === 'modified'
                  ? 'bg-rose-500/12'
                  : isFaultyLeft
                    ? 'bg-amber-500/10'
                    : '';
              const rightBg =
                row.status === 'added' || row.status === 'modified'
                  ? 'bg-emerald-500/12'
                  : '';

              return (
                <div
                  key={idx}
                  className="grid grid-cols-2 border-b border-slate-900/60 last:border-b-0"
                >
                  {/* Original Left Pane */}
                  <div className={`flex border-r border-slate-800/80 ${leftBg}`}>
                    <span className="w-11 shrink-0 select-none border-r border-slate-800/60 px-2 py-0.5 text-right tabular-nums text-slate-500">
                      {row.leftLineNum ?? ''}
                    </span>
                    <span className="w-5 shrink-0 select-none text-center text-rose-400">
                      {row.status === 'removed' || row.status === 'modified' ? '-' : ''}
                    </span>
                    <pre className="flex-1 overflow-x-hidden py-0.5 pr-3 whitespace-pre">
                      {row.leftText
                        ? tokenizeLine(row.leftText, result.language).map((t, ti) => (
                            <span key={ti} className={TOKEN_CLASSES[t.kind]}>
                              {t.text}
                            </span>
                          ))
                        : ' '}
                    </pre>
                  </div>

                  {/* Corrected Right Pane */}
                  <div className={`flex ${rightBg}`}>
                    <span className="w-11 shrink-0 select-none border-r border-slate-800/60 px-2 py-0.5 text-right tabular-nums text-slate-500">
                      {row.rightLineNum ?? ''}
                    </span>
                    <span className="w-5 shrink-0 select-none text-center text-emerald-400">
                      {row.status === 'added' || row.status === 'modified' ? '+' : ''}
                    </span>
                    <pre className="flex-1 overflow-x-hidden py-0.5 pr-3 whitespace-pre">
                      {row.rightText
                        ? tokenizeLine(row.rightText, result.language).map((t, ti) => (
                            <span key={ti} className={TOKEN_CLASSES[t.kind]}>
                              {t.text}
                            </span>
                          ))
                        : ' '}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step-by-Step Explanation + Review Before Applying */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8 rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Step-by-Step Explanation of Corrections
          </h2>
          <div className="mt-4 space-y-3">
            {result.fixSteps.map((step) => (
              <div
                key={`${step.stepNumber}-${step.line}`}
                className="flex gap-3.5 rounded-lg border border-slate-800 bg-[#070B16] p-3.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600/20 font-mono text-xs font-semibold tabular-nums text-blue-300">
                  {step.stepNumber}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-100">{step.title}</span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-blue-400">Line {step.line}</span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-slate-400">{step.source}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Review Gate & Apply Action */}
        <section className="lg:col-span-4 rounded-xl border border-slate-800/90 bg-[#0B1120] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Review & Apply Suggested Fix
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Inspect every diff row on the left before replacing the source code in your active editor workspace.
            </p>

            <label className="mt-5 flex items-start gap-2.5 cursor-pointer rounded-lg border border-slate-800 bg-[#070B16] p-3 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <span>
                I have reviewed the side-by-side changes and want to apply this fix to the editor.
              </span>
            </label>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              disabled={!reviewed}
              onClick={() => onApplyFix(result.fixedCode, true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Apply Fix & Re-Analyze</span>
            </button>

            <button
              type="button"
              disabled={!reviewed}
              onClick={() => onApplyFix(result.fixedCode, false)}
              className="w-full rounded-lg border border-slate-700 bg-[#060913] px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply Fix Only (Open Editor)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
