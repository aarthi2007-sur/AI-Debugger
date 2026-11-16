/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { CodeEditorPanel } from './components/CodeEditorPanel';
import { ErrorResultsPanel } from './components/ErrorResultsPanel';
import { FixDiffPanel } from './components/FixDiffPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { HomeDashboard } from './components/HomeDashboard';
import { type ActiveView, TopBar } from './components/TopBar';
import { LANGUAGE_META, SAMPLE_CASES } from './data/samples';
import type {
  AnalysisResult,
  DebuggingHistoryItem,
  SampleCase,
  SupportedLanguage,
} from './types/debugger';
import {
  clearAllHistory,
  deleteHistoryItem,
  loadDebuggingHistory,
  saveReportToHistory,
} from './utils/historyStorage';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [fileName, setFileName] = useState<string>(SAMPLE_CASES[0].fileName);
  const [code, setCode] = useState<string>(SAMPLE_CASES[0].code);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [history, setHistory] = useState<DebuggingHistoryItem[]>(() =>
    loadDebuggingHistory()
  );

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.aiConfigured === 'boolean') {
          setAiConfigured(data.aiConfigured);
        }
      })
      .catch(() => {
        if (active) setAiConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const runAnalysis = async (
    targetCode: string,
    targetLang: SupportedLanguage,
    targetFileName: string
  ) => {
    setValidationError(null);
    if (!targetCode.trim()) {
      setValidationError('Please enter or upload source code before clicking Analyze Code.');
      return;
    }

    setIsAnalyzing(true);
    setHighlightedLine(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetCode,
          language: targetLang,
          fileName: targetFileName,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setValidationError(payload?.error || 'Source code analysis failed. Please try again.');
        setIsAnalyzing(false);
        return;
      }

      const result = payload as AnalysisResult;
      setAnalysisResult(result);
      setAiConfigured(result.aiConfigured);
      setHistory((prev) => saveReportToHistory(result, prev));
      if (result.errors.length > 0) {
        setHighlightedLine(result.errors[0].line);
      }
    } catch {
      setValidationError('Network error while contacting the analysis server. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLanguageChange = (nextLang: SupportedLanguage) => {
    setLanguage(nextLang);
    // Update default extension/filename if user hasn't uploaded a custom one
    const matchingSample = SAMPLE_CASES.find((s) => s.language === nextLang);
    setFileName(matchingSample ? matchingSample.fileName : LANGUAGE_META[nextLang].fileName);
    setValidationError(null);
  };

  const handleLoadSample = (sample: SampleCase) => {
    setLanguage(sample.language);
    setFileName(sample.fileName);
    setCode(sample.code);
    setAnalysisResult(null);
    setHighlightedLine(null);
    setValidationError(null);
    setActiveView('analyzer');
    void runAnalysis(sample.code, sample.language, sample.fileName);
  };

  const handleClearCode = () => {
    setCode('');
    setAnalysisResult(null);
    setHighlightedLine(null);
    setValidationError(null);
  };

  const handleReopenReport = (item: DebuggingHistoryItem) => {
    setLanguage(item.language);
    setFileName(item.fileName);
    setCode(item.result.originalCode);
    setAnalysisResult(item.result);
    setHighlightedLine(item.result.errors[0]?.line ?? null);
    setValidationError(null);
    setActiveView('analyzer');
  };

  const handleApplyFix = (fixedCode: string, reanalyzeAfter: boolean) => {
    setCode(fixedCode);
    setHighlightedLine(null);
    setActiveView('analyzer');
    if (reanalyzeAfter) {
      void runAnalysis(fixedCode, language, fileName);
    } else {
      setAnalysisResult(null);
    }
  };

  const handleStartDebugging = () => {
    if (!code.trim()) {
      const defaultSample = SAMPLE_CASES[0];
      setLanguage(defaultSample.language);
      setFileName(defaultSample.fileName);
      setCode(defaultSample.code);
    }
    setActiveView('analyzer');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <TopBar
        activeView={activeView}
        onNavigate={setActiveView}
        onStartDebugging={handleStartDebugging}
        hasActiveFix={Boolean(analysisResult)}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <HomeDashboard
                history={history}
                aiConfigured={aiConfigured}
                onStartDebugging={handleStartDebugging}
                onLoadSample={handleLoadSample}
                onReopenReport={handleReopenReport}
                onViewAllHistory={() => setActiveView('history')}
              />
            </motion.div>
          )}

          {activeView === 'analyzer' && (
            <motion.div
              key="analyzer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start"
            >
              <div className="xl:col-span-6">
                <CodeEditorPanel
                  code={code}
                  language={language}
                  fileName={fileName}
                  errors={analysisResult?.errors ?? []}
                  highlightedLine={highlightedLine}
                  isAnalyzing={isAnalyzing}
                  validationError={validationError}
                  onCodeChange={setCode}
                  onLanguageChange={handleLanguageChange}
                  onFileNameChange={setFileName}
                  onLoadSample={handleLoadSample}
                  onAnalyze={() => void runAnalysis(code, language, fileName)}
                  onClear={handleClearCode}
                />
              </div>

              <div className="xl:col-span-6">
                <ErrorResultsPanel
                  result={analysisResult}
                  isAnalyzing={isAnalyzing}
                  highlightedLine={highlightedLine}
                  onSelectLine={setHighlightedLine}
                  onOpenFixDiff={() => setActiveView('diff')}
                />
              </div>
            </motion.div>
          )}

          {activeView === 'diff' && analysisResult && (
            <motion.div
              key="diff"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <FixDiffPanel
                result={analysisResult}
                onApplyFix={handleApplyFix}
                onBackToAnalyzer={() => setActiveView('analyzer')}
              />
            </motion.div>
          )}

          {activeView === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <HistoryPanel
                history={history}
                onReopenReport={handleReopenReport}
                onDeleteReport={(id) => setHistory((prev) => deleteHistoryItem(id, prev))}
                onClearHistory={() => setHistory(clearAllHistory())}
                onStartDebugging={handleStartDebugging}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#060913] py-4 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>AI Debugger · Intelligent Source Code Error Analysis System</span>
          <span>Static AST & Lexical Analysis · Source code is never executed on server</span>
        </div>
      </footer>
    </div>
  );
}
