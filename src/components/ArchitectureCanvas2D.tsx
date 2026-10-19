import { useState } from 'react';
import {
  PodReplica,
  PubSubMessage,
  StorageRecord,
  ClaimRecord,
  SimPacket,
} from '../types';
import {
  Database,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle,
  AlertOctagon,
  XCircle,
  Cpu,
  Power,
  ChevronRight,
  ShieldCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface ArchitectureCanvas2DProps {
  pods: PodReplica[];
  subscriptionBacklog: PubSubMessage[];
  claims: ClaimRecord[];
  storageRecords: StorageRecord[];
  activePackets: SimPacket[];
  pollCountdown: number;
  pollIntervalSec: number;
  activeScenario?: import('../types').ActiveScenarioInfo | null;
  onSelectPod: (pod: PodReplica) => void;
  onSelectRecord: (record: StorageRecord) => void;
  onReplayMessage: (hashKey: string) => void;
  onTogglePodHealth: (podId: string) => void;
}

export function ArchitectureCanvas2D({
  pods,
  subscriptionBacklog,
  claims,
  storageRecords,
  activePackets,
  pollCountdown,
  pollIntervalSec,
  activeScenario,
  onSelectPod,
  onSelectRecord,
  onReplayMessage,
  onTogglePodHealth,
}: ArchitectureCanvas2DProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const acceptedRecords = storageRecords.filter((r) => r.status === 'ACCEPTED');
  const failedRecords = storageRecords.filter((r) => r.status === 'FAILED');
  const dlqRecords = storageRecords.filter((r) => r.status === 'DLQ');

  // Compute countdown percentage for circular radar (5s cycle)
  const pollProgressRatio = 1 - pollCountdown / pollIntervalSec;
  const strokeDashoffset = 100 - pollProgressRatio * 100;

  // Pod positions in 2D diagram coordinate space (1280 x 740)
  const podPositions = [
    { id: 'worker-pod-0', x: 440, y: 130, w: 320, h: 105 },
    { id: 'worker-pod-1', x: 440, y: 255, w: 320, h: 105 },
    { id: 'worker-pod-2', x: 440, y: 380, w: 320, h: 105 },
    { id: 'worker-pod-3', x: 440, y: 505, w: 320, h: 105 },
  ];

  return (
    <div className="relative w-full overflow-x-auto bg-slate-950 p-6 select-none">
      <div className="min-w-[1240px] max-w-[1440px] mx-auto relative rounded-2xl bg-gradient-to-b from-slate-900/60 to-slate-950/80 border border-slate-800/80 p-6 shadow-2xl overflow-hidden">
        {/* Subtle Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top Status & Legend Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-semibold text-slate-200">GKE Scaled Topology</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">4 Worker Pods (Replicas)</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-slate-400">
              <span>Polling Frequency:</span>
              <span className="text-cyan-400 font-semibold">{pollIntervalSec.toFixed(1)}s</span>
              <span>(every 5s heartbeat pull)</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Poll / Ingest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Atomic Claim</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Accepted (Unique Index)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>DLQ / Failed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Replay Arc</span>
            </div>
          </div>
        </div>

        {/* 2D Interactive Diagram Canvas Grid */}
        <div className="grid grid-cols-12 gap-5 relative z-10 items-stretch">
          {/* ========================================================= */}
          {/* ZONE 1: Cloud Pub/Sub Ingestion & Subscription (Cols 1-3) */}
          {/* ========================================================= */}
          <div className="col-span-3 flex flex-col gap-4">
            {/* Pub/Sub Topic Ingress */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pub/Sub Topic</span>
                </span>
                <span className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                  Ingress Stream
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300 font-semibold truncate mb-1">
                projects/corp-prod/topics/events-inbound
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Publishers emit events with deterministic idempotency hash keys.
              </p>
            </div>

            {/* Pub/Sub Subscription Node */}
            <div className="flex-1 p-4 rounded-xl bg-slate-900/90 border border-cyan-900/50 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Pub/Sub Subscription
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Pull Mode
                  </span>
                </div>

                <p className="text-xs font-mono text-slate-300 font-semibold mb-3">
                  subscription/gke-worker-sub
                </p>

                {/* 5-Second Circular Polling Radar */}
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 mb-4 flex items-center gap-3">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-cyan-400 transition-all duration-100 ease-linear"
                        strokeDasharray="100, 100"
                        strokeDashoffset={strokeDashoffset}
                        strokeWidth="3"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute text-[11px] font-mono font-bold text-cyan-300 tabular-nums">
                      {pollCountdown.toFixed(1)}s
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      5-Second Poll Cadence
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {pollCountdown <= 0.6 ? 'Polling 4 GKE pods now...' : `Next pull in ${pollCountdown.toFixed(1)}s`}
                    </span>
                  </div>
                </div>

                {/* Backlog Queue Counter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Unpolled Backlog:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {subscriptionBacklog.length} messages
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {subscriptionBacklog.length === 0 ? (
                      <div className="p-3 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
                        Backlog empty (streaming nominal)
                      </div>
                    ) : (
                      subscriptionBacklog.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between group hover:border-cyan-500/50 transition-colors"
                        >
                          <div className="truncate mr-2">
                            <span className="text-slate-300 font-semibold">{msg.payload.eventType}</span>
                            <span className="text-slate-500 ml-1">({msg.payload.entityId})</span>
                            <div className="text-cyan-400 text-[10px] truncate">
                              Hash: {msg.hashKey.substring(0, 14)}...
                            </div>
                          </div>
                          <span className="text-slate-400 shrink-0 text-[10px] bg-slate-900 px-1 rounded">
                            Att {msg.attemptCount}/3
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Pub/Sub to Pods Connection Pointer */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Distribution:</span>
                <span className="text-cyan-400">Round-Robin Pull to 4 Pods</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ZONE 2: GKE Cluster & 4 Replica Pods (Cols 4-8)           */}
          {/* ========================================================= */}
          <div className="col-span-5 flex flex-col gap-3">
            {/* GKE Cluster Header Card */}
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-indigo-900/60 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 leading-tight">
                    GKE Cluster · ReplicaSet (4 Identical Replicas)
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Horizontal Scalability · Concurrent Message Consumption
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>4/4 Replicas Ready</span>
              </div>
            </div>

            {/* 4 Replica Pod Cards */}
            <div className="flex flex-col gap-3 flex-1 justify-between">
              {pods.map((pod) => {
                const isOffline = pod.status === 'OFFLINE';
                const isClaiming = pod.status === 'CLAIMING';
                const isProcessing = pod.status === 'PROCESSING';
                const isAcking = pod.status === 'ACKING';
                const isPolling = pod.status === 'POLLING';

                return (
                  <div
                    key={pod.id}
                    onClick={() => onSelectPod(pod)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isOffline
                        ? 'bg-slate-950/60 border-slate-800/60 opacity-60'
                        : isClaiming
                        ? 'bg-purple-950/30 border-purple-500/60 shadow-lg shadow-purple-900/20'
                        : isProcessing
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-900/20'
                        : isAcking
                        ? 'bg-emerald-950/30 border-emerald-500/60'
                        : isPolling
                        ? 'bg-cyan-950/30 border-cyan-500/50'
                        : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    {/* Header line: Pod name, status pill, and power toggle */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOffline
                              ? 'bg-slate-600'
                              : isProcessing
                              ? 'bg-indigo-400 animate-pulse'
                              : isClaiming
                              ? 'bg-purple-400 animate-pulse'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span className="text-xs font-bold font-mono text-slate-100">
                          {pod.id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          (Replica #{pod.replicaIndex + 1})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Label */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                            isOffline
                              ? 'bg-slate-800 text-slate-400'
                              : isClaiming
                              ? 'bg-purple-900/70 text-purple-200 border border-purple-700'
                              : isProcessing
                              ? 'bg-indigo-900/70 text-indigo-200 border border-indigo-700'
                              : isAcking
                              ? 'bg-emerald-900/70 text-emerald-200 border border-emerald-700'
                              : isPolling
                              ? 'bg-cyan-900/70 text-cyan-200 border border-cyan-700'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {pod.status}
                        </span>

                        {/* Power toggle for resilience testing */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePodHealth(pod.id);
                          }}
                          title={isOffline ? 'Start Pod' : 'Stop Pod (Failover test)'}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Active Message & Hash Key Preview */}
                    <div className="bg-slate-950/80 rounded-md p-2 border border-slate-800/80 mb-2 font-mono text-[11px] flex items-center justify-between">
                      {pod.currentMessageHash ? (
                        <div className="truncate mr-2">
                          <span className="text-slate-400">Active Hash: </span>
                          <span className="text-purple-300 font-semibold font-mono">
                            {pod.currentMessageHash.substring(0, 16)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">
                          {isOffline ? 'Pod offline' : 'Awaiting 5s poll cycle batch...'}
                        </span>
                      )}

                      <span className="text-slate-400 shrink-0 text-[10px]">
                        CPU {pod.cpuLoad}%
                      </span>
                    </div>

                    {/* Telemetry Metrics Strip */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                      <div>
                        <span>Accepted: </span>
                        <span className="text-emerald-400 font-semibold">{pod.processedCount}</span>
                      </div>
                      <div>
                        <span>Blocked Dups: </span>
                        <span className="text-amber-400 font-semibold">{pod.blockedDuplicateCount}</span>
                      </div>
                      <div>
                        <span>Failed: </span>
                        <span className="text-rose-400 font-semibold">{pod.failedCount}</span>
                      </div>
                      <div className="text-right text-slate-500 truncate">
                        {pod.ipAddress}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* ZONE 3: Persistent Storage & Unique Index (Cols 9-12)     */}
          {/* ========================================================= */}
          <div className="col-span-4 flex flex-col gap-4">
            {/* Database Engine Header */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Persistent Storage</span>
                </span>
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                  PostgreSQL / Spanner
                </span>
              </div>

              {/* Idempotency Index Callout */}
              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>UNIQUE INDEX (hash_key)</span>
                </div>
                <p className="text-[11px] text-indigo-300/80 leading-tight mt-1">
                  Guarantees exactly-once side-effects. Duplicate delivery hashes hit constraint and are safely skipped.
                </p>
              </div>

              {/* Atomic Claim Lock Arbiter */}
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Atomic Lease Engine:</span>
                </div>
                <span className="text-purple-300 font-semibold">
                  {claims.length > 0 ? `${claims.length} Active Lease` : '0 Claims (Unlocked)'}
                </span>
              </div>
            </div>

            {/* 3 Partition Tables: Accepted / Failed / DLQ */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Partition 1: ACCEPTED */}
              <div className="flex-1 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-900/50 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Accepted Messages
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {acceptedRecords.length}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                  Successfully claimed, processed, and recorded with unique index.
                </p>

                {/* Preview latest 2 accepted */}
                <div className="space-y-1">
                  {acceptedRecords.slice(0, 2).map((rec) => (
                    <div
                      key={rec.hashKey}
                      onClick={() => onSelectRecord(rec)}
                      className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer flex items-center justify-between text-[10px] font-mono"
                    >
                      <span className="text-emerald-300 truncate max-w-[130px]">
                        {rec.hashKey.substring(0, 14)}...
                      </span>
                      <span className="text-slate-400">{rec.claimedByPodId}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partition 2: FAILED */}
              <div className="flex-1 p-3.5 rounded-xl bg-slate-900/90 border border-amber-900/50 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Failed (Transient / Retrying)
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    {failedRecords.length}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                  Transient errors. Attempt &lt; 3. Supports atomic claim replay.
                </p>

                <div className="space-y-1">
                  {failedRecords.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic p-1">No active transient failures</div>
                  ) : (
                    failedRecords.slice(0, 2).map((rec) => (
                      <div
                        key={rec.hashKey}
                        className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[10px] font-mono"
                      >
                        <div className="truncate mr-1">
                          <span className="text-amber-300">{rec.hashKey.substring(0, 12)}...</span>
                          <span className="text-slate-500 ml-1">Att {rec.attemptCount}/3</span>
                        </div>
                        <button
                          onClick={() => onReplayMessage(rec.hashKey)}
                          title="Replay this message"
                          className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 bg-slate-900 hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Replay</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Partition 3: DLQ (Dead Letter Queue) */}
              <div className="flex-1 p-3.5 rounded-xl bg-slate-900/90 border border-rose-900/50 shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      Dead Letter Queue (DLQ)
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                    {dlqRecords.length}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                  Exceeded 3 retry attempts or poison pill payload.
                </p>

                <div className="space-y-1">
                  {dlqRecords.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic p-1">No poison pills in DLQ</div>
                  ) : (
                    dlqRecords.slice(0, 2).map((rec) => (
                      <div
                        key={rec.hashKey}
                        className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[10px] font-mono"
                      >
                        <div className="truncate mr-1">
                          <span className="text-rose-300">{rec.hashKey.substring(0, 12)}...</span>
                          <span className="text-rose-500 ml-1">(Exhausted)</span>
                        </div>
                        <button
                          onClick={() => onReplayMessage(rec.hashKey)}
                          title="Replay DLQ message back to stream"
                          className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 bg-slate-900 hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Replay</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Flying Packets / Particle Overlay */}
        {activePackets.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {activePackets.map((pkt) => {
              // Approximate coordinate mappings for visual flight paths
              let startX = 280;
              let startY = 320;
              let targetX = 440;
              let targetY = 280;

              // Compute target pod coordinates
              if (pkt.target === 'worker-pod-0') {
                targetX = 440;
                targetY = 160;
              } else if (pkt.target === 'worker-pod-1') {
                targetX = 440;
                targetY = 285;
              } else if (pkt.target === 'worker-pod-2') {
                targetX = 440;
                targetY = 410;
              } else if (pkt.target === 'worker-pod-3') {
                targetX = 440;
                targetY = 535;
              } else if (pkt.target === 'storage-db') {
                startX = 760;
                targetX = 960;
                targetY = 240;
              } else if (pkt.target === 'dlq-storage') {
                startX = 760;
                targetX = 960;
                targetY = 560;
              } else if (pkt.target === 'subscription') {
                startX = 960;
                targetX = 280;
                targetY = 320;
              }

              if (pkt.source === 'worker-pod-0') {
                startX = 760;
                startY = 160;
              } else if (pkt.source === 'worker-pod-1') {
                startX = 760;
                startY = 285;
              } else if (pkt.source === 'worker-pod-2') {
                startX = 760;
                startY = 410;
              } else if (pkt.source === 'worker-pod-3') {
                startX = 760;
                startY = 535;
              }

              const currentX = startX + (targetX - startX) * pkt.progress;
              const currentY = startY + (targetY - startY) * pkt.progress;

              let color = 'bg-cyan-400 shadow-cyan-400/50';
              if (pkt.type === 'CLAIM_REQUEST') color = 'bg-purple-400 shadow-purple-400/50';
              if (pkt.type === 'DB_COMMIT') color = 'bg-emerald-400 shadow-emerald-400/50';
              if (pkt.type === 'DLQ_ROUTE') color = 'bg-rose-400 shadow-rose-400/50';
              if (pkt.type === 'REPLAY_STREAM') color = 'bg-amber-400 shadow-amber-400/50';

              return (
                <div
                  key={pkt.id}
                  style={{
                    transform: `translate3d(${currentX}px, ${currentY}px, 0)`,
                    transition: 'transform 0.05s linear',
                  }}
                  className="absolute flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${color} shadow-lg ring-2 ring-white/30`} />
                  {pkt.messageHash && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/90 text-white border border-slate-700 whitespace-nowrap shadow-md">
                      {pkt.messageHash.substring(0, 10)}...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
