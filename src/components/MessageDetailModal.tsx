import { useState } from 'react';
import { StorageRecord } from '../types';
import {
  X,
  ShieldCheck,
  RotateCcw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  Clock,
  Terminal,
} from 'lucide-react';

interface MessageDetailModalProps {
  record: StorageRecord | null;
  onClose: () => void;
  onReplay: (hashKey: string) => void;
}

export function MessageDetailModal({
  record,
  onClose,
  onReplay,
}: MessageDetailModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!record) return null;

  const isAccepted = record.status === 'ACCEPTED';
  const isFailed = record.status === 'FAILED';
  const isDlq = record.status === 'DLQ';

  const handleCopyHash = () => {
    navigator.clipboard.writeText(record.hashKey);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(record.payloadJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span
              className={`p-1.5 rounded-lg ${
                isAccepted
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : isFailed
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {isAccepted && <CheckCircle2 className="w-5 h-5" />}
              {isFailed && <AlertTriangle className="w-5 h-5" />}
              {isDlq && <XCircle className="w-5 h-5" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  {record.id}
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isAccepted
                      ? 'bg-emerald-900/60 text-emerald-300'
                      : isFailed
                      ? 'bg-amber-900/60 text-amber-300'
                      : 'bg-rose-900/60 text-rose-300'
                  }`}
                >
                  {record.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Claimed by <span className="text-indigo-400 font-mono">{record.claimedByPodId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Idempotency Hash Key Box */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-900/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Deterministic Idempotency Hash (SHA-256)</span>
              </span>
              <button
                onClick={handleCopyHash}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>

            <div className="p-2 bg-slate-900/90 rounded border border-slate-800 font-mono text-xs text-indigo-200 select-all break-all">
              {record.hashKey}
            </div>

            <p className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
              Enforced by database constraint: <code className="text-indigo-300 font-mono">UNIQUE(hash_key)</code>. Any redelivered Pub/Sub message with this identical hash is rejected from double-processing and safely acknowledged.
            </p>
          </div>

          {/* Atomic Claim & SQL Transaction Execution Trace */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2 text-slate-300 font-semibold text-xs">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Simulated Atomic Claim &amp; Database Trace</span>
            </div>

            <pre className="p-2.5 bg-slate-900/90 rounded border border-slate-800 text-[11px] text-cyan-300 font-mono overflow-x-auto leading-relaxed">
{`-- 1. Atomic lease acquisition with lease lock
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM message_claims 
WHERE hash_key = '${record.hashKey.substring(0, 16)}...'
FOR UPDATE SKIP LOCKED;

-- 2. Check persistent state
INSERT INTO messages_store (
  hash_key, status, claimed_by, attempts, processed_at
) VALUES (
  '${record.hashKey.substring(0, 16)}...', '${record.status}', '${record.claimedByPodId}', ${record.attemptCount}, NOW()
) ON CONFLICT (hash_key) 
DO UPDATE SET duplicate_hits = messages_store.duplicate_hits + 1;

COMMIT;`}
            </pre>
          </div>

          {/* Timings & Attempt Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Attempt Budget</span>
              <span className="text-slate-200 font-bold">{record.attemptCount} / 3</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Execution Latency</span>
              <span className="text-slate-200 font-bold">{record.executionDurationMs}ms</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Duplicates Blocked</span>
              <span className="text-purple-300 font-bold">{record.duplicateEncounterCount}</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Replay Count</span>
              <span className="text-emerald-300 font-bold">{record.replayedCount}</span>
            </div>
          </div>

          {/* Raw JSON Payload */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-slate-400" />
                <span>Raw Message Payload</span>
              </span>
              <button
                onClick={handleCopyJson}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-900/90 rounded border border-slate-800 text-[11px] text-slate-200 font-mono overflow-x-auto max-h-48">
              {record.payloadJson}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {record.completedAt ? (
              <span>Committed {new Date(record.completedAt).toLocaleTimeString()}</span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {(isFailed || isDlq) && (
              <button
                onClick={() => {
                  onReplay(record.hashKey);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay Message</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
