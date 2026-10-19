import { useState, useMemo } from 'react';
import { StorageRecord } from '../types';
import {
  Database,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Eye,
  Copy,
  Clock,
  Layers,
} from 'lucide-react';

interface StorageExplorerProps {
  records: StorageRecord[];
  onSelectRecord: (record: StorageRecord) => void;
  onReplayMessage: (hashKey: string) => void;
  onReplayAllFailed: () => void;
}

export function StorageExplorer({
  records,
  onSelectRecord,
  onReplayMessage,
  onReplayAllFailed,
}: StorageExplorerProps) {
  const [filter, setFilter] = useState<'ALL' | 'ACCEPTED' | 'FAILED' | 'DLQ'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesFilter = filter === 'ALL' || r.status === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.hashKey.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.payloadSummary.toLowerCase().includes(q) ||
        r.claimedByPodId.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [records, filter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: records.length,
      accepted: records.filter((r) => r.status === 'ACCEPTED').length,
      failed: records.filter((r) => r.status === 'FAILED').length,
      dlq: records.filter((r) => r.status === 'DLQ').length,
      duplicatesBlocked: records.reduce((acc, r) => acc + (r.duplicateEncounterCount || 0), 0),
    };
  }, [records]);

  const handleCopyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Metrics Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Persistent Storage Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            PostgreSQL / Spanner schema with strict <code className="text-indigo-300 font-mono">UNIQUE INDEX (hash_key)</code> idempotency guarantees.
          </p>
        </div>

        {(counts.failed > 0 || counts.dlq > 0) && (
          <button
            onClick={onReplayAllFailed}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/80 rounded-lg transition-colors shadow-sm shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span>Replay All Unresolved ({counts.failed + counts.dlq})</span>
          </button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-slate-400 block text-[11px] mb-1">Total Stored</span>
          <span className="text-base font-bold text-slate-200 tabular-nums">{counts.all}</span>
        </div>

        <div className="p-3 bg-slate-900/80 border border-emerald-900/50 rounded-xl">
          <span className="text-emerald-400 block text-[11px] mb-1">Accepted (Committed)</span>
          <span className="text-base font-bold text-emerald-300 tabular-nums">{counts.accepted}</span>
        </div>

        <div className="p-3 bg-slate-900/80 border border-amber-900/50 rounded-xl">
          <span className="text-amber-400 block text-[11px] mb-1">Failed (Retrying)</span>
          <span className="text-base font-bold text-amber-300 tabular-nums">{counts.failed}</span>
        </div>

        <div className="p-3 bg-slate-900/80 border border-rose-900/50 rounded-xl">
          <span className="text-rose-400 block text-[11px] mb-1">Dead Letter Queue</span>
          <span className="text-base font-bold text-rose-300 tabular-nums">{counts.dlq}</span>
        </div>

        <div className="p-3 bg-slate-900/80 border border-purple-900/50 rounded-xl">
          <span className="text-purple-400 block text-[11px] mb-1">Duplicates Intercepted</span>
          <span className="text-base font-bold text-purple-300 tabular-nums">{counts.duplicatesBlocked}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-full sm:w-auto">
          {(['ALL', 'ACCEPTED', 'FAILED', 'DLQ'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setFilter(tabKey)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tabKey
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tabKey === 'ALL' && `All Records (${counts.all})`}
              {tabKey === 'ACCEPTED' && `Accepted (${counts.accepted})`}
              {tabKey === 'FAILED' && `Failed (${counts.failed})`}
              {tabKey === 'DLQ' && `DLQ (${counts.dlq})`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search hash, ID, pod..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Database Schema Code Banner */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            DDL: <span className="text-slate-300">CREATE UNIQUE INDEX idx_msg_hash ON messages_store (hash_key);</span>
          </span>
        </div>
        <span className="text-slate-500">
          Enforces atomicity &amp; zero duplicate executions across all 4 GKE pods
        </span>
      </div>

      {/* Main Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Unique Hash Key (SHA-256)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Event Payload Summary</th>
                <th className="py-3 px-4">Claimed Pod</th>
                <th className="py-3 px-4 text-center">Attempts</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No persistent records matching current filter
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isAccepted = record.status === 'ACCEPTED';
                  const isFailed = record.status === 'FAILED';
                  const isDlq = record.status === 'DLQ';

                  return (
                    <tr
                      key={record.hashKey}
                      onClick={() => onSelectRecord(record)}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      {/* Hash Key column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              isAccepted
                                ? 'text-emerald-300'
                                : isFailed
                                ? 'text-amber-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {record.hashKey.substring(0, 14)}...
                          </span>
                          <button
                            onClick={(e) => handleCopyHash(record.hashKey, e)}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
                            title="Copy full hash key"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedHash === record.hashKey && (
                            <span className="text-[10px] text-cyan-400 font-sans">Copied</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{record.id}</div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            isAccepted
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                              : isFailed
                              ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                              : 'bg-rose-950/70 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isAccepted && <CheckCircle2 className="w-3 h-3" />}
                          {isFailed && <AlertTriangle className="w-3 h-3" />}
                          {isDlq && <XCircle className="w-3 h-3" />}
                          <span>{record.status}</span>
                        </span>
                        {record.duplicateEncounterCount > 0 && (
                          <div className="text-[10px] text-purple-400 mt-0.5">
                            +{record.duplicateEncounterCount} dup blocked
                          </div>
                        )}
                      </td>

                      {/* Payload Summary */}
                      <td className="py-3 px-4 font-sans max-w-xs truncate">
                        <span className="text-slate-200 block truncate">
                          {record.payloadSummary}
                        </span>
                        {record.errorReason && (
                          <span className="text-rose-400 text-[11px] block truncate">
                            Error: {record.errorReason}
                          </span>
                        )}
                      </td>

                      {/* Claimed Pod */}
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span>{record.claimedByPodId}</span>
                        </div>
                      </td>

                      {/* Attempts */}
                      <td className="py-3 px-4 text-center tabular-nums">
                        <span
                          className={
                            record.attemptCount >= 3
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-300'
                          }
                        >
                          {record.attemptCount} / 3
                        </span>
                      </td>

                      {/* Execution Duration */}
                      <td className="py-3 px-4 tabular-nums text-slate-400 text-[11px]">
                        {record.executionDurationMs}ms
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {(isFailed || isDlq) && (
                            <button
                              onClick={() => onReplayMessage(record.hashKey)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 rounded transition-colors"
                              title="Replay this message: resets lease lock and resubmits to Pub/Sub"
                            >
                              <RotateCcw className="w-3 h-3 text-emerald-400" />
                              <span>Replay</span>
                            </button>
                          )}

                          <button
                            onClick={() => onSelectRecord(record)}
                            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            title="Inspect Message Details & Transaction Log"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
