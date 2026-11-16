import { Bug, Code2, GitCompare, History, LayoutDashboard, Play } from 'lucide-react';

export type ActiveView = 'overview' | 'analyzer' | 'diff' | 'history';

interface TopBarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onStartDebugging: () => void;
  hasActiveFix: boolean;
}

export function TopBar({
  activeView,
  onNavigate,
  onStartDebugging,
  hasActiveFix,
}: TopBarProps) {
  const navItems: Array<{ id: ActiveView; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analyzer', label: 'Code Analyzer', icon: Code2 },
    { id: 'diff', label: 'Fix Diff', icon: GitCompare },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060913]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('overview')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-sm">
            <Bug className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-50">
            AI Debugger
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const disabled = item.id === 'diff' && !hasActiveFix;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                disabled={disabled}
                className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${
                  isActive
                    ? 'text-blue-400'
                    : disabled
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-300 hover:text-slate-50'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartDebugging}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Start Debugging</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center gap-1 overflow-x-auto border-t border-slate-800/80 px-4 py-1.5"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const disabled = item.id === 'diff' && !hasActiveFix;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              disabled={disabled}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-slate-800 text-blue-400'
                  : disabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-300 hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
