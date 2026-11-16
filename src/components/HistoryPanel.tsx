import { Download, FolderOpen, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { LANGUAGE_META } from '../data/samples';
import type { DebuggingHistoryItem, SupportedLanguage } from '../types/debugger';
import { downloadDebuggingReportMarkdown } from '../utils/reportExport';

interface HistoryPanelProps {
  history: DebuggingHistoryItem[];
  onReopenReport: (item: DebuggingHistoryItem) => void;
  onDeleteReport: (id: string) => void;
  onClearHistory: () => void;
  onStartDebugging: () => void;
}

const LANGUAGE_FILTERS: Array<'all' | SupportedLanguage> = [
  'all',
  'python',
  'c',
  'cpp',
  'java',
  'javascript',
];

export function HistoryPanel({
  history,
  onReopenReport,
  onDeleteReport,
  onClearHistory,
  onStartDebugging,
}: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [langFilter, setLangFilter] = useState<'all' | SupportedLanguage>('all');

  const filtered = history.filter((item) => {
    const matchesLang = langFilter === 'all' || item.language === langFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.fileName.toLowerCase().includes(q) ||
      item.topCategory.toLowerCase().includes(q) ||
      LANGUAGE_META[item.language].label.toLowerCase().includes(q);
    return matchesLang && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-50">
              Debugging History
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Saved reports stay stored locally in your browser to protect source code privacy.
            </p>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3.5 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/40 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear All History</span>
            </button>
          )}
        </div>

        {/* Search & Language Filter Controls */}
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by file name, language, or error type..."
              className="w-full rounded-lg border border-slate-700 bg-[#060913] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {LANGUAGE_FILTERS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLangFilter(lang)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  langFilter === lang
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-800 bg-[#070B16] text-slate-300 hover:text-slate-100'
                }`}
              >
                {lang === 'all' ? 'All Languages' : LANGUAGE_META[lang].label}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Table */}
        {filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 p-10 text-center">
            <p className="text-sm font-medium text-slate-200">
              {history.length === 0
                ? 'Your debugging history is empty'
                : 'No reports match your search criteria'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Run a new source code analysis to save a report here.
            </p>
            <button
              type="button"
              onClick={onStartDebugging}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Go to Code Analyzer
            </button>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                  <th className="py-3 pr-4">File</th>
                  <th className="py-3 pr-4">Language</th>
                  <th className="py-3 pr-4">Primary Category</th>
                  <th className="py-3 pr-4 text-right">Detected Errors</th>
                  <th className="py-3 pr-4">Date & Time</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-mono text-xs font-medium text-slate-100">
                        {item.fileName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.staticCount} Static · {item.aiCount} AI
                        {item.isSample ? ' · Sample' : ''}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-300 whitespace-nowrap">
                      {LANGUAGE_META[item.language].label}
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-300 whitespace-nowrap">
                      {item.topCategory}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono text-xs tabular-nums">
                      <span
                        className={
                          item.errorCount > 0
                            ? 'font-semibold text-rose-400'
                            : 'font-semibold text-emerald-400'
                        }
                      >
                        {item.errorCount}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-slate-400 whitespace-nowrap">
                      {new Date(item.analyzedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onReopenReport(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#060913] px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:border-blue-500/60"
                        >
                          <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Open</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDebuggingReportMarkdown(item.result)}
                          aria-label={`Export ${item.fileName} report`}
                          className="rounded-md border border-slate-700 bg-[#060913] p-1.5 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteReport(item.id)}
                          aria-label={`Delete ${item.fileName} report`}
                          className="rounded-md border border-slate-700 bg-[#060913] p-1.5 text-slate-400 hover:border-rose-500/50 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
