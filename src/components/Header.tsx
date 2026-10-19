import { Play, Pause, RefreshCw, Layers, ShieldCheck, Database, HelpCircle, Sparkles } from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onTriggerPoll: () => void;
  pollCountdown: number;
  activeTab: 'diagram' | 'canvas' | 'simple' | 'storage' | 'audit' | 'specs';
  setActiveTab: (tab: 'diagram' | 'canvas' | 'simple' | 'storage' | 'audit' | 'specs') => void;
  onOpenExplainer: () => void;
}

export function Header({
  isRunning,
  onToggleRunning,
  onTriggerPoll,
  pollCountdown,
  activeTab,
  setActiveTab,
  onOpenExplainer,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block leading-tight">
            GKE Pub/Sub Stream Engine
          </span>
          <span className="text-xs text-slate-400 font-mono tracking-tight block">
            4 Replica Pods · 5s Poll · Atomic Claim · Unique Hash Idempotency
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation / View Tabs */}
      <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-950/60 rounded-lg border border-slate-800/70">
        <button
          onClick={() => setActiveTab('diagram')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'diagram'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>Visual Architecture Diagram</span>
        </button>

        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'canvas'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Live Cluster Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('simple')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'simple'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Concept Walkthrough</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'storage'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Persistent Storage</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Stream</span>
        </button>

        <button
          onClick={() => setActiveTab('specs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'specs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Architecture Principles</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action & Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Countdown Telemetry Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Next 5s Poll:</span>
          <span className="text-cyan-400 font-semibold tabular-nums w-8 text-right">
            {pollCountdown.toFixed(1)}s
          </span>
        </div>

        <button
          onClick={onTriggerPoll}
          title="Poll Pub/Sub Immediately"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Poll Now</span>
        </button>

        <button
          onClick={onToggleRunning}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm ${
            isRunning
              ? 'bg-amber-600/90 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Timer</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Resume 5s Timer</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
