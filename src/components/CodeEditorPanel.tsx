import { Eraser, Loader2, Play, Upload } from 'lucide-react';
import { useRef } from 'react';
import { LANGUAGE_META, SAMPLE_CASES } from '../data/samples';
import type { DetectedError, SampleCase, SupportedLanguage } from '../types/debugger';
import { TOKEN_CLASSES, tokenizeLine } from '../utils/syntaxHighlight';

interface CodeEditorPanelProps {
  code: string;
  language: SupportedLanguage;
  fileName: string;
  errors: DetectedError[];
  highlightedLine: number | null;
  isAnalyzing: boolean;
  validationError: string | null;
  onCodeChange: (nextCode: string) => void;
  onLanguageChange: (nextLang: SupportedLanguage) => void;
  onFileNameChange: (nextName: string) => void;
  onLoadSample: (sample: SampleCase) => void;
  onAnalyze: () => void;
  onClear: () => void;
}

const LANGUAGES: SupportedLanguage[] = ['python', 'c', 'cpp', 'java', 'javascript'];

export function CodeEditorPanel({
  code,
  language,
  fileName,
  errors,
  highlightedLine,
  isAnalyzing,
  validationError,
  onCodeChange,
  onLanguageChange,
  onFileNameChange,
  onLoadSample,
  onAnalyze,
  onClear,
}: CodeEditorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lines = code.split('\n');
  const errorLineMap = new Map<number, DetectedError[]>();
  for (const err of errors) {
    const existing = errorLineMap.get(err.line) ?? [];
    existing.push(err);
    errorLineMap.set(err.line, existing);
  }

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const indent = language === 'python' ? '    ' : '  ';
      const updated = code.slice(0, start) + indent + code.slice(end);
      onCodeChange(updated);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + indent.length;
          textareaRef.current.selectionEnd = start + indent.length;
        }
      });
    }
  };

  const detectLanguageFromExtension = (name: string): SupportedLanguage | null => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.py')) return 'python';
    if (lower.endsWith('.c')) return 'c';
    if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx') || lower.endsWith('.hpp')) return 'cpp';
    if (lower.endsWith('.java')) return 'java';
    if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.jsx')) return 'javascript';
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const detectedLang = detectLanguageFromExtension(file.name);
      if (detectedLang) {
        onLanguageChange(detectedLang);
      }
      onFileNameChange(file.name);
      onCodeChange(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section className="flex flex-col rounded-xl border border-slate-800/90 bg-[#0B1120] overflow-hidden">
      {/* Editor Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-[#090E1C] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Language Selector Dropdown */}
          <label className="sr-only" htmlFor="language-select">
            Programming Language
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            className="rounded-lg border border-slate-700 bg-[#060913] px-3 py-2 text-xs font-medium text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_META[lang].label}
              </option>
            ))}
          </select>

          {/* Load Sample Dropdown */}
          <label className="sr-only" htmlFor="sample-select">
            Load Sample Buggy Program
          </label>
          <select
            id="sample-select"
            value=""
            onChange={(e) => {
              const found = SAMPLE_CASES.find((s) => s.id === e.target.value);
              if (found) onLoadSample(found);
            }}
            className="rounded-lg border border-slate-700 bg-[#060913] px-3 py-2 text-xs font-medium text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="" disabled>
              Load Sample Case...
            </option>
            {SAMPLE_CASES.map((s) => (
              <option key={s.id} value={s.id}>
                {LANGUAGE_META[s.language].label}: {s.title}
              </option>
            ))}
          </select>

          {/* Upload File Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.c,.cpp,.cc,.cxx,.h,.hpp,.java,.js,.jsx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060913] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-900 whitespace-nowrap shrink-0"
          >
            <Upload className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
            <span>Upload File</span>
          </button>

          {/* Clear Code Button */}
          <button
            type="button"
            onClick={onClear}
            disabled={!code && !isAnalyzing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060913] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear Code</span>
          </button>
        </div>

        {/* Analyze Code Primary CTA */}
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap shrink-0"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Analyze Code</span>
            </>
          )}
        </button>
      </div>

      {/* VS Code Tab Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#070B16] px-4 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-slate-200 truncate">{fileName}</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400">{LANGUAGE_META[language].label}</span>
        </div>
        <div className="font-mono text-[11px] tabular-nums text-slate-400 whitespace-nowrap shrink-0">
          {lines.length} {lines.length === 1 ? 'line' : 'lines'} · {code.length} chars
        </div>
      </div>

      {validationError && (
        <div
          role="alert"
          className="border-b border-rose-500/30 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-300"
        >
          {validationError}
        </div>
      )}

      {/* VS Code-Inspired Syntax Highlighted Editor Surface */}
      <div className="relative flex h-[520px] bg-[#060913] font-mono text-[13px] leading-[22px]">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 shrink-0 select-none overflow-hidden border-r border-slate-800/80 bg-[#070B15] py-3 text-right"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const lineErrors = errorLineMap.get(lineNum);
            const hasCritical = lineErrors?.some((e) => e.severity === 'critical');
            const isSelected = highlightedLine === lineNum;
            return (
              <div
                key={lineNum}
                className={`flex items-center justify-end gap-1.5 pr-2.5 tabular-nums h-[22px] ${
                  isSelected
                    ? 'bg-blue-500/20 text-blue-300 font-semibold'
                    : hasCritical
                      ? 'bg-rose-500/15 text-rose-400 font-semibold'
                      : lineErrors
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'text-slate-500'
                }`}
              >
                {lineErrors && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasCritical ? 'bg-rose-500' : 'bg-amber-400'
                    }`}
                  />
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Overlay Syntax Highlight + Transparent Editable Textarea */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={highlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden py-3 px-4 whitespace-pre"
          >
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const lineErrors = errorLineMap.get(lineNum);
              const hasCritical = lineErrors?.some((e) => e.severity === 'critical');
              const isSelected = highlightedLine === lineNum;
              const tokens = tokenizeLine(line, language);
              return (
                <div
                  key={lineNum}
                  className={`h-[22px] ${
                    isSelected
                      ? 'bg-blue-500/15 -mx-4 px-4'
                      : hasCritical
                        ? 'bg-rose-500/10 -mx-4 px-4'
                        : lineErrors
                          ? 'bg-amber-500/5 -mx-4 px-4'
                          : ''
                  }`}
                >
                  {tokens.length === 0 ? (
                    <span> </span>
                  ) : (
                    tokens.map((tok, tIdx) => (
                      <span key={tIdx} className={TOKEN_CLASSES[tok.kind]}>
                        {tok.text}
                      </span>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          <textarea
            ref={textareaRef}
            aria-label="Source Code Editor"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder="Paste your Python, C, C++, Java, or JavaScript source code here, or upload a file..."
            className="code-editor relative z-10 h-full w-full resize-none overflow-auto bg-transparent py-3 px-4 font-mono text-[13px] leading-[22px] text-transparent caret-blue-400 placeholder:text-slate-600 focus:outline-none whitespace-pre"
          />
        </div>
      </div>
    </section>
  );
}
