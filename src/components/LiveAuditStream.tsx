import { useState } from 'react';
import { AuditEvent } from '../types';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  RotateCcw,
} from 'lucide-react';

interface LiveAuditStreamProps {
  events: AuditEvent[];
  onSelectHash?: (hash: string) => void;
}

export function LiveAuditStream({ events, onSelectHash }: LiveAuditStreamProps) {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((evt) => {
    const matchesSeverity = filterSeverity === 'all' || evt.severity === filterSeverity;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      evt.description.toLowerCase().includes(q) ||
      (evt.hashKey && evt.hashKey.toLowerCase().includes(q)) ||
      (evt.podId && evt.podId.toLowerCase().includes(q)) ||
      (evt.messageId && evt.messageId.toLowerCase().includes(q));
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span>Live Distributed Claim and Execution Audit Stream</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time event log tracing GKE 5s polling, atomic lease acquisition, idempotency index checks, and storage commits.
          </p>
        </div>

        {/* Severity Filter Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          {(['all', 'info', 'success', 'warning', 'error'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded capitalize transition-colors ${
                filterSeverity === sev
                  ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter audit events by hash, pod, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
        />
      </div>

      {/* Events List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg divide-y divide-slate-800/80 font-mono text-xs">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No audit events found matching filters
          </div>
        ) : (
          filteredEvents.map((evt) => {
            let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
            let icon = <Radio className="w-3.5 h-3.5 text-cyan-400" />;

            if (evt.severity === 'success') {
              badgeBg = 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
            } else if (evt.severity === 'warning') {
              badgeBg = 'bg-amber-950/70 text-amber-300 border-amber-800';
              icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
            } else if (evt.severity === 'error') {
              badgeBg = 'bg-rose-950/70 text-rose-300 border-rose-800';
              icon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
            }

            if (evt.type === 'REPLAY_TRIGGERED') {
              badgeBg = 'bg-indigo-950/70 text-indigo-300 border-indigo-800';
              icon = <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />;
            }

            return (
              <div
                key={evt.id}
                className="p-3 hover:bg-slate-800/40 transition-colors flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0">{icon}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-slate-400 text-[11px] tabular-nums">
                      {new Date(evt.timestamp).toLocaleTimeString()}.{String(evt.timestamp % 1000).padStart(3, '0')}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${badgeBg}`}
                    >
                      {evt.type}
                    </span>

                    {evt.podId && (
                      <span className="text-[10px] text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {evt.podId}
                      </span>
                    )}

                    {evt.hashKey && (
                      <button
                        onClick={() => onSelectHash && onSelectHash(evt.hashKey!)}
                        className="text-[10px] text-cyan-400 hover:underline bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[140px]"
                        title="View Hash Details"
                      >
                        {evt.hashKey.substring(0, 12)}...
                      </button>
                    )}
                  </div>

                  <p className="text-slate-200 text-xs font-sans leading-relaxed">
                    {evt.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
