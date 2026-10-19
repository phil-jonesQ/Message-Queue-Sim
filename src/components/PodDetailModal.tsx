import { PodReplica } from '../types';
import {
  X,
  Cpu,
  Power,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
} from 'lucide-react';

interface PodDetailModalProps {
  pod: PodReplica | null;
  onClose: () => void;
  onToggleHealth: (podId: string) => void;
}

export function PodDetailModal({
  pod,
  onClose,
  onToggleHealth,
}: PodDetailModalProps) {
  if (!pod) return null;

  const isOffline = pod.status === 'OFFLINE';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">{pod.id}</h3>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Replica #{pod.replicaIndex + 1}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Node: {pod.nodeName}
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

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status & Power */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOffline ? 'bg-slate-600' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-slate-300 font-semibold">Pod Status:</span>
              <span
                className={`font-bold uppercase tracking-wider ${
                  isOffline ? 'text-slate-500' : 'text-emerald-400'
                }`}
              >
                {pod.status}
              </span>
            </div>

            <button
              onClick={() => onToggleHealth(pod.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                isOffline
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOffline ? 'Restart Pod' : 'Simulate Crash'}</span>
            </button>
          </div>

          {/* Active Workload */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 text-[11px] block">Active In-Flight Message</span>
            {pod.currentMessageHash ? (
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-purple-300 break-all select-all block">
                  {pod.currentMessageHash}
                </span>
                <span className="text-slate-500 text-[10px] block mt-1">
                  ID: {pod.currentMessageId}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 italic block">No active claim lock. Idle.</span>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">CPU Utilization</span>
              <span className="text-slate-200 font-bold">{pod.cpuLoad}%</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Memory Footprint</span>
              <span className="text-slate-200 font-bold">{pod.memoryUsageMb} MB</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Accepted (Processed)</span>
              <span className="text-emerald-300 font-bold">{pod.processedCount}</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Duplicates Blocked</span>
              <span className="text-purple-300 font-bold">{pod.blockedDuplicateCount}</span>
            </div>
          </div>

          {/* GKE Metadata */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Pod IP Address:</span>
              <span className="text-slate-200 font-mono">{pod.ipAddress}</span>
            </div>
            <div className="flex justify-between">
              <span>Cluster Namespace:</span>
              <span className="text-slate-200 font-mono">pubsub-workers</span>
            </div>
            <div className="flex justify-between">
              <span>Replica Group:</span>
              <span className="text-slate-200 font-mono">4 Pods (HPA Scaled)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
