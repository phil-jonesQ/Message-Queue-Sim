import { useState, useEffect, useRef } from 'react';
import {
  PodReplica,
  PubSubMessage,
  StorageRecord,
  ClaimRecord,
  ActiveScenarioInfo,
} from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Copy,
  Zap,
  AlertTriangle,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Database,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface FlyingEnvelope {
  id: string;
  source: string;
  target: string;
  color: string; // 'blue' | 'green' | 'orange' | 'purple' | 'rose'
  progress: number; // 0 to 1
  pathD: string;
  hashKey: string;
  status?: string;
}

interface CleanGraphicArchitectureViewProps {
  pods: PodReplica[];
  subscriptionBacklog: PubSubMessage[];
  claims: ClaimRecord[];
  storageRecords: StorageRecord[];
  pollCountdown: number;
  pollIntervalSec: number;
  isRunning: boolean;
  activeScenario?: ActiveScenarioInfo | null;
  onToggleRunning: () => void;
  onTriggerPoll: () => void;
  onInjectNormal: () => void;
  onTestDuplicate: () => void;
  onTestRaceCondition: () => void;
  onTestPoisonPill: () => void;
  onReplayAllFailed: () => void;
  onReplayMessage: (hashKey: string) => void;
  onSelectRecord: (record: StorageRecord) => void;
  onSelectPod: (pod: PodReplica) => void;
}

export function CleanGraphicArchitectureView({
  pods,
  subscriptionBacklog,
  claims,
  storageRecords,
  pollCountdown,
  pollIntervalSec,
  isRunning,
  activeScenario,
  onToggleRunning,
  onTriggerPoll,
  onInjectNormal,
  onTestDuplicate,
  onTestRaceCondition,
  onTestPoisonPill,
  onReplayAllFailed,
  onReplayMessage,
  onSelectRecord,
  onSelectPod,
}: CleanGraphicArchitectureViewProps) {
  const [envelopes, setEnvelopes] = useState<FlyingEnvelope[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const acceptedRecords = storageRecords.filter((r) => r.status === 'ACCEPTED');
  const failedRecords = storageRecords.filter((r) => r.status === 'FAILED');
  const dlqRecords = storageRecords.filter((r) => r.status === 'DLQ');

  // Spawn an envelope moving along an SVG path
  const spawnEnvelope = (
    pathD: string,
    color: 'blue' | 'green' | 'orange' | 'purple' | 'rose',
    hashKey: string,
    durationMs = 1200
  ) => {
    const id = `env-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEnv: FlyingEnvelope = {
      id,
      source: '',
      target: '',
      color,
      progress: 0,
      pathD,
      hashKey,
    };

    setEnvelopes((prev) => [...prev, newEnv]);

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      setEnvelopes((prev) =>
        prev
          .map((e) => (e.id === id ? { ...e, progress } : e))
          .filter((e) => e.id !== id || progress < 1)
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  // Trigger visual envelopes on 5s poll countdown hits near zero
  useEffect(() => {
    if (pollCountdown <= 0.2 && isRunning) {
      // Flow envelopes from 3 Publishers to Channel
      spawnEnvelope('M 170 120 C 230 120, 240 280, 290 280', 'blue', '0x8f4d92a1');
      spawnEnvelope('M 170 280 L 290 280', 'green', '0x3b7c4a1e');
      spawnEnvelope('M 170 440 C 230 440, 240 280, 290 280', 'orange', '0x7e1a90c5');

      // Flow from Channel to 4 Subscriber Pods
      setTimeout(() => {
        spawnEnvelope('M 480 280 C 530 280, 540 90, 600 90', 'blue', '0x8f4d92a1');
        spawnEnvelope('M 480 280 C 530 280, 540 215, 600 215', 'green', '0x3b7c4a1e');
        spawnEnvelope('M 480 280 C 530 280, 540 345, 600 345', 'orange', '0x7e1a90c5');
        spawnEnvelope('M 480 280 C 530 280, 540 475, 600 475', 'blue', '0x1c8b9d3e');
      }, 500);

      // Flow from Pods through Claim to Persistent Storage
      setTimeout(() => {
        spawnEnvelope('M 770 90 C 820 90, 830 190, 890 190', 'green', '0x8f4d92a1');
        spawnEnvelope('M 770 215 C 820 215, 830 190, 890 190', 'green', '0x3b7c4a1e');
        spawnEnvelope('M 770 345 C 820 345, 830 320, 890 320', 'orange', '0x7e1a90c5');
        spawnEnvelope('M 770 475 C 820 475, 830 450, 890 450', 'rose', '0x1c8b9d3e');
      }, 1200);
    }
  }, [pollCountdown, isRunning]);

  // When scenario triggers, animate specific visual envelopes
  useEffect(() => {
    if (!activeScenario) return;

    if (activeScenario.id === 'duplicate') {
      // Animate duplicate envelope reaching Pod 1 and stopping at DB unique index
      spawnEnvelope('M 480 280 C 530 280, 540 215, 600 215', 'orange', '0x8f4d (DUP)');
      setTimeout(() => {
        spawnEnvelope('M 770 215 C 820 215, 830 190, 890 190', 'orange', '0x8f4d (BLOCKED)');
      }, 500);
    } else if (activeScenario.id === 'race') {
      // Animate 2 envelopes racing to claim lock
      spawnEnvelope('M 480 280 C 530 280, 540 90, 600 90', 'purple', '0xrace (Pod-0)');
      spawnEnvelope('M 480 280 C 530 280, 540 215, 600 215', 'purple', '0xrace (Pod-1)');
      setTimeout(() => {
        spawnEnvelope('M 770 90 C 820 90, 830 190, 890 190', 'green', '0xrace (WINNER)');
      }, 600);
    } else if (activeScenario.id === 'poison') {
      // Animate poison pill to DLQ
      spawnEnvelope('M 480 280 C 530 280, 540 475, 600 475', 'rose', '0xpoison (Att 3)');
      setTimeout(() => {
        spawnEnvelope('M 770 475 C 820 475, 830 450, 890 450', 'rose', '0xpoison -> DLQ');
      }, 600);
    } else if (activeScenario.id === 'replay') {
      // Animate replay loop from DLQ back to Channel!
      spawnEnvelope('M 890 450 C 700 580, 400 580, 380 340', 'blue', 'REPLAY MSG', 1500);
      setTimeout(() => {
        spawnEnvelope('M 480 280 C 530 280, 540 90, 600 90', 'green', 'REPLAYED -> ACCEPTED');
      }, 1000);
    }
  }, [activeScenario]);

  // SVG Helper: Calculate point along path for flying envelopes
  const getPointOnPath = (pathD: string, progress: number) => {
    if (typeof document === 'undefined') return { x: 0, y: 0 };
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathD);
    const totalLength = tempPath.getTotalLength ? tempPath.getTotalLength() : 300;
    const point = tempPath.getPointAtLength ? tempPath.getPointAtLength(progress * totalLength) : { x: 300, y: 200 };
    return point;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Controls & Explanation Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Visual Architecture Overview
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Graphical diagram matching the standard Pub/Sub specification: Publishers → Channel (5s Polling) → 4 GKE Subscriber Pods → Atomic Claim → Persistent Storage (Accepted, DLQ, Failed).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono shadow-sm">
            <span className="text-slate-500">5s Poll Tick:</span>
            <span className="text-blue-600 dark:text-cyan-400 font-bold tabular-nums">
              {pollCountdown.toFixed(1)}s
            </span>
          </div>

          <button
            onClick={onTriggerPoll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span>Poll Now</span>
          </button>

          <button
            onClick={onToggleRunning}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors ${
              isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scenario Action Buttons Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Animate Scenarios:
          </span>

          <button
            onClick={onInjectNormal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium hover:bg-blue-100 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publish Normal Message</span>
          </button>

          <button
            onClick={onTestDuplicate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium hover:bg-amber-100 transition-colors shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Test Duplicate Hash (Idempotency)</span>
          </button>

          <button
            onClick={onTestRaceCondition}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium hover:bg-purple-100 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Test Race Condition (Atomic Claim)</span>
          </button>

          <button
            onClick={onTestPoisonPill}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium hover:bg-rose-100 transition-colors shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Failure and DLQ</span>
          </button>

          {(failedRecords.length > 0 || dlqRecords.length > 0) && (
            <button
              onClick={onReplayAllFailed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay All Failed ({failedRecords.length + dlqRecords.length})</span>
            </button>
          )}
        </div>

        {activeScenario && (
          <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>{activeScenario.name}</span>
          </div>
        )}
      </div>

      {/* Main Vector Architectural Graphic (Matching the user's uploaded diagram style) */}
      <div className="relative rounded-2xl bg-[#edf2f7] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-6 shadow-xl overflow-x-auto select-none">
        <svg
          ref={svgRef}
          viewBox="0 0 1140 580"
          className="w-full min-w-[1040px] h-auto drop-shadow-sm font-sans"
        >
          <defs>
            {/* Arrow Marker */}
            <marker
              id="arrow-slate"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#94a3b8" />
            </marker>

            <marker
              id="arrow-blue"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#3b82f6" />
            </marker>

            <marker
              id="arrow-green"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
            </marker>

            <marker
              id="arrow-orange"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#f97316" />
            </marker>

            {/* Cylinder Gradient */}
            <linearGradient id="cylinderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
            </linearGradient>

            <filter id="cardShadow" x="-5%" y="-5%" width="115%" height="115%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* 1. LEFT: 3 Publishers (Blue, Green, Orange)                     */}
          {/* ============================================================== */}
          {/* Publisher 1 (Blue) */}
          <g transform="translate(30, 80)">
            <rect
              x="0"
              y="0"
              width="140"
              height="80"
              rx="14"
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth="2.5"
              filter="url(#cardShadow)"
            />
            <text x="70" y="46" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">
              Publisher
            </text>
            <circle cx="140" cy="40" r="3.5" fill="#1e293b" />
          </g>

          {/* Publisher 2 (Green) */}
          <g transform="translate(30, 240)">
            <rect
              x="0"
              y="0"
              width="140"
              height="80"
              rx="14"
              fill="#ffffff"
              stroke="#10b981"
              strokeWidth="2.5"
              filter="url(#cardShadow)"
            />
            <text x="70" y="46" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">
              Publisher
            </text>
            <circle cx="140" cy="40" r="3.5" fill="#1e293b" />
          </g>

          {/* Publisher 3 (Orange) */}
          <g transform="translate(30, 400)">
            <rect
              x="0"
              y="0"
              width="140"
              height="80"
              rx="14"
              fill="#ffffff"
              stroke="#ea580c"
              strokeWidth="2.5"
              filter="url(#cardShadow)"
            />
            <text x="70" y="46" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1e293b">
              Publisher
            </text>
            <circle cx="140" cy="40" r="3.5" fill="#1e293b" />
          </g>

          {/* ============================================================== */}
          {/* 2. CONNECTING WIRES: Publishers -> Pub-Sub Channel             */}
          {/* ============================================================== */}
          {/* Blue Path */}
          <path
            d="M 170 120 C 240 120, 245 280, 290 280"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
          />
          {/* Green Path */}
          <path
            d="M 170 280 L 290 280"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
          />
          {/* Orange Path */}
          <path
            d="M 170 440 C 240 440, 245 280, 290 280"
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
          />
          {/* Arrow pointing into channel */}
          <path
            d="M 285 280 L 298 280"
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            markerEnd="url(#arrow-orange)"
          />

          {/* Static Envelope Icons near Publishers (Matching screenshot) */}
          {/* Blue Envelope */}
          <g transform="translate(190, 85)">
            <rect x="0" y="0" width="26" height="18" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            <path d="M 0 0 L 13 10 L 26 0" fill="none" stroke="#2563eb" strokeWidth="1.8" />
          </g>
          {/* Green Envelope */}
          <g transform="translate(190, 245)">
            <rect x="0" y="0" width="26" height="18" rx="2" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
            <path d="M 0 0 L 13 10 L 26 0" fill="none" stroke="#10b981" strokeWidth="1.8" />
          </g>
          {/* Orange Envelope */}
          <g transform="translate(190, 405)">
            <rect x="0" y="0" width="26" height="18" rx="2" fill="#ffffff" stroke="#ea580c" strokeWidth="2" />
            <path d="M 0 0 L 13 10 L 26 0" fill="none" stroke="#ea580c" strokeWidth="1.8" />
          </g>

          {/* ============================================================== */}
          {/* 3. CENTER: Pub-sub Service & Channel Cylinder                  */}
          {/* ============================================================== */}
          <g transform="translate(305, 205)">
            {/* Dashed outer boundary container */}
            <rect
              x="0"
              y="0"
              width="170"
              height="150"
              rx="16"
              fill="#ffffff"
              fillOpacity="0.7"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            {/* Title above cylinder */}
            <text x="85" y="-14" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#334155">
              Pub-sub service
            </text>
            <text x="85" y="24" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b" fontFamily="monospace">
              Polls every 5.0s
            </text>

            {/* Cylinder Channel 3D graphic */}
            <g transform="translate(15, 45)">
              {/* Back base of cylinder */}
              <ellipse cx="20" cy="35" rx="14" ry="30" fill="#64748b" opacity="0.3" />
              {/* Body tube */}
              <rect x="20" y="5" width="100" height="60" fill="url(#cylinderGrad)" />
              {/* Front right rim */}
              <ellipse cx="120" cy="35" rx="14" ry="30" fill="#94a3b8" opacity="0.9" stroke="#64748b" strokeWidth="1.5" />
              {/* Text inside channel */}
              <text x="68" y="41" textAnchor="middle" fontSize="17" fontWeight="bold" fill="#ffffff">
                Channel
              </text>
            </g>

            {/* Countdown Badge */}
            <g transform="translate(42, 122)">
              <rect x="0" y="0" width="86" height="18" rx="9" fill="#1e293b" />
              <text x="43" y="13" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#38bdf8" fontFamily="monospace">
                Next: {pollCountdown.toFixed(1)}s
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* 4. BRANCHING WIRES: Channel -> 4 GKE Subscriber Pods           */}
          {/* ============================================================== */}
          {/* Main trunk dot */}
          <circle cx="475" cy="280" r="3.5" fill="#94a3b8" />

          {/* Branch to Pod 0 (y: 90) */}
          <path
            d="M 475 280 C 530 280, 535 90, 585 90"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />
          {/* Branch to Pod 1 (y: 215) */}
          <path
            d="M 475 280 C 530 280, 535 215, 585 215"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />
          {/* Branch to Pod 2 (y: 345) */}
          <path
            d="M 475 280 C 530 280, 535 345, 585 345"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />
          {/* Branch to Pod 3 (y: 475) */}
          <path
            d="M 475 280 C 530 280, 535 475, 585 475"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />

          {/* Envelopes clustered before each subscriber pod (matching screenshot) */}
          {/* Cluster for Pod 0 */}
          <g transform="translate(505, 75)">
            <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
            <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#ea580c" strokeWidth="1.2" />
            <g transform="translate(24, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#10b981" strokeWidth="1.2" />
            </g>
            <g transform="translate(48, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#2563eb" strokeWidth="1.2" />
            </g>
          </g>

          {/* Cluster for Pod 1 */}
          <g transform="translate(505, 200)">
            <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
            <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#ea580c" strokeWidth="1.2" />
            <g transform="translate(24, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#10b981" strokeWidth="1.2" />
            </g>
            <g transform="translate(48, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#2563eb" strokeWidth="1.2" />
            </g>
          </g>

          {/* Cluster for Pod 2 */}
          <g transform="translate(505, 330)">
            <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
            <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#ea580c" strokeWidth="1.2" />
            <g transform="translate(24, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#10b981" strokeWidth="1.2" />
            </g>
            <g transform="translate(48, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#2563eb" strokeWidth="1.2" />
            </g>
          </g>

          {/* Cluster for Pod 3 */}
          <g transform="translate(505, 460)">
            <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
            <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#ea580c" strokeWidth="1.2" />
            <g transform="translate(24, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#10b981" strokeWidth="1.2" />
            </g>
            <g transform="translate(48, 0)">
              <rect x="0" y="0" width="20" height="14" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
              <path d="M 0 0 L 10 7 L 20 0" fill="none" stroke="#2563eb" strokeWidth="1.2" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* 5. 4 GKE SUBSCRIBER PODS (Replicas for Scalability)            */}
          {/* ============================================================== */}
          {pods.map((pod, idx) => {
            const yPos = 50 + idx * 128;
            const isClaiming = pod.status === 'CLAIMING';
            const isProcessing = pod.status === 'PROCESSING';

            let borderColor = '#94a3b8';
            if (isClaiming) borderColor = '#a855f7';
            if (isProcessing) borderColor = '#3b82f6';
            if (pod.status === 'ACKING') borderColor = '#10b981';

            return (
              <g
                key={pod.id}
                transform={`translate(590, ${yPos})`}
                onClick={() => onSelectPod(pod)}
                className="cursor-pointer group"
              >
                <rect
                  x="0"
                  y="0"
                  width="170"
                  height="80"
                  rx="14"
                  fill="#ffffff"
                  stroke={borderColor}
                  strokeWidth="2.5"
                  filter="url(#cardShadow)"
                  className="transition-colors group-hover:stroke-blue-600"
                />
                <text x="85" y="36" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#1e293b">
                  Subscriber
                </text>
                <text x="85" y="56" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b" fontFamily="monospace">
                  GKE Pod #{idx} · {pod.status}
                </text>
                <circle cx="170" cy="40" r="3.5" fill="#1e293b" />
              </g>
            );
          })}

          {/* ============================================================== */}
          {/* 6. RIGHT: Atomic Claim Lock & Persistent Storage               */}
          {/* ============================================================== */}
          {/* Wires connecting Pods to Persistent Storage */}
          <path
            d="M 760 90 C 830 90, 830 190, 895 190"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />
          <path
            d="M 760 215 C 830 215, 830 190, 895 190"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />
          <path
            d="M 760 345 C 830 345, 830 320, 895 320"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />
          <path
            d="M 760 475 C 830 475, 830 450, 895 450"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            markerEnd="url(#arrow-slate)"
          />

          {/* Atomic Claim Lock Badge in the Middle of Wires */}
          <g transform="translate(805, 255)">
            <rect x="0" y="0" width="76" height="48" rx="10" fill="#ffffff" stroke="#9333ea" strokeWidth="2" filter="url(#cardShadow)" />
            <text x="38" y="22" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7e22ce" fontFamily="monospace">
              ATOMIC
            </text>
            <text x="38" y="36" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7e22ce" fontFamily="monospace">
              LOCK
            </text>
          </g>

          {/* Destination 1: ACCEPTED Storage (Green card) */}
          <g transform="translate(905, 150)">
            <rect
              x="0"
              y="0"
              width="190"
              height="80"
              rx="14"
              fill="#ffffff"
              stroke="#10b981"
              strokeWidth="2.5"
              filter="url(#cardShadow)"
            />
            <text x="95" y="34" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#047857">
              Accepted
            </text>
            <text x="95" y="54" textAnchor="middle" fontSize="11" fontWeight="600" fill="#059669" fontFamily="monospace">
              UNIQUE(hash) · {acceptedRecords.length} msgs
            </text>
          </g>

          {/* Destination 2: FAILED Storage (Amber card) */}
          <g transform="translate(905, 280)">
            <rect
              x="0"
              y="0"
              width="190"
              height="80"
              rx="14"
              fill="#ffffff"
              stroke="#f59e0b"
              strokeWidth="2.5"
              filter="url(#cardShadow)"
            />
            <text x="95" y="34" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#b45309">
              Failed (Retry)
            </text>
            <text x="95" y="54" textAnchor="middle" fontSize="11" fontWeight="600" fill="#d97706" fontFamily="monospace">
              Attempt &lt; 3 · {failedRecords.length} msgs
            </text>
          </g>

          {/* Destination 3: DLQ Storage (Red card) */}
          <g transform="translate(905, 410)">
            <rect
              x="0"
              y="0"
              width="190"
              height="80"
              rx="14"
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth="2.5"
              filter="url(#cardShadow)"
            />
            <text x="95" y="34" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#b91c1c">
              Dead Letter (DLQ)
            </text>
            <text x="95" y="54" textAnchor="middle" fontSize="11" fontWeight="600" fill="#dc2626" fontFamily="monospace">
              Exhausted · {dlqRecords.length} msgs
            </text>
          </g>

          {/* ============================================================== */}
          {/* 7. REPLAY LOOP: DLQ / Failed back to Pub-sub Channel           */}
          {/* ============================================================== */}
          <path
            d="M 905 450 C 700 560, 420 560, 390 355"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="5 5"
            markerEnd="url(#arrow-blue)"
          />
          <g transform="translate(580, 535)">
            <rect x="0" y="0" width="130" height="22" rx="11" fill="#1e293b" />
            <text x="65" y="15" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#60a5fa" fontFamily="monospace">
              ↺ REPLAY STREAM ARC
            </text>
          </g>

          {/* ============================================================== */}
          {/* 8. ACTIVE FLYING ENVELOPES (Dynamic Animated Packets)           */}
          {/* ============================================================== */}
          {envelopes.map((env) => {
            const pt = getPointOnPath(env.pathD, env.progress);
            let strokeColor = '#2563eb';
            if (env.color === 'green') strokeColor = '#10b981';
            if (env.color === 'orange') strokeColor = '#ea580c';
            if (env.color === 'purple') strokeColor = '#9333ea';
            if (env.color === 'rose') strokeColor = '#e11d48';

            return (
              <g
                key={env.id}
                transform={`translate(${pt.x - 14}, ${pt.y - 10})`}
                className="pointer-events-none drop-shadow-md"
              >
                <rect
                  x="0"
                  y="0"
                  width="28"
                  height="20"
                  rx="3"
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth="2.2"
                />
                <path
                  d="M 0 0 L 14 11 L 28 0"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2"
                />
                {/* Hash tag label floating above */}
                <rect
                  x="-10"
                  y="-16"
                  width="48"
                  height="13"
                  rx="3"
                  fill="#1e293b"
                  opacity="0.9"
                />
                <text
                  x="14"
                  y="-7"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#38bdf8"
                  fontFamily="monospace"
                >
                  {env.hashKey.substring(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Concept Explanation Footer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>1. Pub/Sub Channel</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            The subscription buffers event messages and dispenses batches to the 4 worker replicas every 5.0 seconds.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>2. 4 GKE Replicas</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Four horizontal worker pods pull messages concurrently for 4x throughput, fault tolerance, and zero bottlenecking.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>3. Atomic Claim and Hash</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Pods acquire an exclusive lease before execution. Database <code className="text-emerald-600 dark:text-emerald-400 font-mono">UNIQUE(hash)</code> blocks duplicates.
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>4. Storage and Replay</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Successful messages become <strong className="text-emerald-600">Accepted</strong>. Failures route to <strong className="text-rose-600">DLQ</strong> and can be replayed back to the channel.
          </p>
        </div>
      </div>
    </div>
  );
}
