import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Clock,
  Lock,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  Sparkles,
} from 'lucide-react';

interface ConceptStep {
  title: string;
  subtitle: string;
  stepNumber: number;
  totalSteps: number;
  visualStage: 'polling' | 'claiming' | 'idempotency' | 'dlq' | 'replay';
  explanation: string;
  codeOrSql: string;
}

const CONCEPTS = [
  {
    id: 'polling',
    title: '1. Scaled 5s Polling (4 GKE Pods)',
    badge: 'Scalability & Throughput',
    steps: [
      {
        stepNumber: 1,
        totalSteps: 4,
        title: 'Publishers Ingest Events to Topic',
        subtitle: 'Messages arrive with deterministic hash keys',
        visualStage: 'polling' as const,
        explanation:
          'Producers send events into the Pub/Sub Topic. Each message contains a unique business identifier and payload.',
        codeOrSql: 'pubsub.publish({ topic: "events-inbound", message: { id: "msg-101", hash: "0x8f4d..." } })',
      },
      {
        stepNumber: 2,
        totalSteps: 4,
        title: 'Subscription Buffers the Queue',
        subtitle: 'Messages held securely with ack deadline',
        visualStage: 'polling' as const,
        explanation:
          'The Cloud Pub/Sub Subscription holds the queue. Messages remain unacknowledged until a worker pod successfully finishes processing.',
        codeOrSql: 'Subscription: "gke-worker-sub" (ackDeadlineSeconds: 30, retention: 7 days)',
      },
      {
        stepNumber: 3,
        totalSteps: 4,
        title: '5-Second Heartbeat Poll',
        subtitle: 'Idle pods pull batches every 5 seconds',
        visualStage: 'polling' as const,
        explanation:
          'Every 5.0 seconds, idle worker pods in GKE issue pull requests. This prevents tight polling loops while maintaining low streaming latency.',
        codeOrSql: 'setInterval(() => subscription.pull({ maxMessages: 10 }), 5000);',
      },
      {
        stepNumber: 4,
        totalSteps: 4,
        title: 'Distributed Across 4 Replicas',
        subtitle: 'Horizontal pod autoscaling parallelizes load',
        visualStage: 'polling' as const,
        explanation:
          'Because there are 4 identical pod replicas, messages are pulled and executed concurrently, achieving 4x throughput and zero single-point-of-failure.',
        codeOrSql: 'Kubernetes Deployment: replicas = 4 (Pod 0, Pod 1, Pod 2, Pod 3 in parallel)',
      },
    ],
  },
  {
    id: 'claiming',
    title: '2. Atomic Claim Process',
    badge: 'Atomicity & Race Prevention',
    steps: [
      {
        stepNumber: 1,
        totalSteps: 4,
        title: 'Redelivery Race Condition Risk',
        subtitle: 'Two pods receive duplicate deliveries of same hash',
        visualStage: 'claiming' as const,
        explanation:
          'Due to network delays or overlapping pull intervals, Pub/Sub may redeliver the same message to Pod 0 and Pod 1 simultaneously.',
        codeOrSql: 'Scenario: Pod-0 and Pod-1 both hold message with Hash: 0x9e4c... at t=0ms',
      },
      {
        stepNumber: 2,
        totalSteps: 4,
        title: 'Atomic Lease Request (CAS / Lock)',
        subtitle: 'Both pods request exclusive claim before processing',
        visualStage: 'claiming' as const,
        explanation:
          'Before executing any side-effects, each worker pod issues an atomic lease transaction in persistent storage: SELECT ... FOR UPDATE SKIP LOCKED.',
        codeOrSql: 'SELECT * FROM message_claims WHERE hash_key = "0x9e4c..." FOR UPDATE SKIP LOCKED;',
      },
      {
        stepNumber: 3,
        totalSteps: 4,
        title: 'Pod 0 Wins Exclusive Lease',
        subtitle: 'Pod 1 receives lock contention conflict and yields',
        visualStage: 'claiming' as const,
        explanation:
          'Persistent storage atomically grants the 30-second processing lease to Pod 0. Pod 1 encounters a lock collision, backs off, and yields execution.',
        codeOrSql: 'Lease Result: Pod-0 -> GRANTED (TTL 30s) | Pod-1 -> COLLISION_DETECTED (Yield & Backoff)',
      },
      {
        stepNumber: 4,
        totalSteps: 4,
        title: 'Atomic Processing Isolation',
        subtitle: 'Business logic runs exactly once without race conditions',
        visualStage: 'claiming' as const,
        explanation:
          'Pod 0 safely processes the business logic in total isolation. No double charges or duplicate executions occur.',
        codeOrSql: 'Pod-0 completes step -> commits record -> releases atomic claim lock -> ACKs message',
      },
    ],
  },
  {
    id: 'idempotency',
    title: '3. Unique Hash Idempotency',
    badge: 'Database Constraint',
    steps: [
      {
        stepNumber: 1,
        totalSteps: 4,
        title: 'Deterministic Hash Key Generation',
        subtitle: 'SHA-256 derived from event business payload',
        visualStage: 'idempotency' as const,
        explanation:
          'Each message arrives with its own unique cryptographic hash key computed over business identifiers (e.g. eventType:orderId:customerId).',
        codeOrSql: 'hashKey = SHA256("OrderCreated:ord-9042:cust-482") => 0x8f4d92a1...',
      },
      {
        stepNumber: 2,
        totalSteps: 4,
        title: 'First Delivery: Committed to Storage',
        subtitle: 'Record created in table under UNIQUE INDEX',
        visualStage: 'idempotency' as const,
        explanation:
          'Pod processes message for the first time and inserts record into persistent storage. The unique index registers the hash.',
        codeOrSql: 'INSERT INTO messages_store (hash_key, status) VALUES ("0x8f4d...", "ACCEPTED");',
      },
      {
        stepNumber: 3,
        totalSteps: 4,
        title: 'Duplicate Delivery Arrives (Re-poll)',
        subtitle: 'Network timeout triggers redelivery of same message',
        visualStage: 'idempotency' as const,
        explanation:
          'Pub/Sub redelivers the message. Another pod pulls it and attempts to write to persistent storage with the same hash key.',
        codeOrSql: 'Redelivery attempt: INSERT INTO messages_store (hash_key) VALUES ("0x8f4d...");',
      },
      {
        stepNumber: 4,
        totalSteps: 4,
        title: 'Database UNIQUE Constraint Intercepts',
        subtitle: 'Side effects skipped, safe ACK sent to Pub/Sub',
        visualStage: 'idempotency' as const,
        explanation:
          'The database UNIQUE INDEX detects the duplicate hash, rejects double-writing, and the pod safely ACKs the message without repeating work.',
        codeOrSql: 'ON CONFLICT (hash_key) DO NOTHING; -- Pod skips side-effects & acks cleanly!',
      },
    ],
  },
  {
    id: 'dlq',
    title: '4. Storage Buckets & DLQ',
    badge: 'Failure Isolation',
    steps: [
      {
        stepNumber: 1,
        totalSteps: 4,
        title: 'Nominal Messages -> ACCEPTED',
        subtitle: 'Happy path execution committed immediately',
        visualStage: 'dlq' as const,
        explanation:
          'Messages that validate and process without errors are marked ACCEPTED in persistent storage and acknowledged to Pub/Sub.',
        codeOrSql: 'UPDATE messages_store SET status = "ACCEPTED", completed_at = NOW();',
      },
      {
        stepNumber: 2,
        totalSteps: 4,
        title: 'Transient Errors -> FAILED (Attempt 1-2)',
        subtitle: 'Downstream RPC timeout triggers retry budget',
        visualStage: 'dlq' as const,
        explanation:
          'If an external API or database is temporarily unreachable, the message is marked FAILED and attempt counter is incremented.',
        codeOrSql: 'UPDATE messages_store SET status = "FAILED", attempts = attempts + 1; -- Retry permitted',
      },
      {
        stepNumber: 3,
        totalSteps: 4,
        title: 'Poison Pill Exceeds 3 Attempts',
        subtitle: 'Retry budget exhausted (3/3 attempts)',
        visualStage: 'dlq' as const,
        explanation:
          'If a malformed payload fails 3 consecutive times, repeating retries would clog the worker pods and waste cluster CPU.',
        codeOrSql: 'IF attempts >= 3 THEN status = "DLQ"; -- Max retry budget reached',
      },
      {
        stepNumber: 4,
        totalSteps: 4,
        title: 'Escalation to Dead Letter Queue',
        subtitle: 'Quarantined for operator review with zero data loss',
        visualStage: 'dlq' as const,
        explanation:
          'The poison pill is transferred into persistent DLQ storage with its full stack trace, preserving data integrity without blocking normal stream traffic.',
        codeOrSql: 'INSERT INTO dead_letter_queue SELECT * FROM messages_store WHERE status = "DLQ";',
      },
    ],
  },
  {
    id: 'replay',
    title: '5. The Replay Mechanism',
    badge: 'Disaster Recovery',
    steps: [
      {
        stepNumber: 1,
        totalSteps: 4,
        title: 'Message Stalled in DLQ or FAILED',
        subtitle: 'Poison pill or failed message awaiting remediation',
        visualStage: 'replay' as const,
        explanation:
          'A failed payment or corrupted invoice is safely held in DLQ or FAILED partition. Downstream services have now recovered.',
        codeOrSql: 'Target: msg-seed-104 (status: DLQ, attempts: 3/3, hash: 0x1c8b...)',
      },
      {
        stepNumber: 2,
        totalSteps: 4,
        title: 'Operator Triggers Replay Action',
        subtitle: 'One-click manual or automated replay execution',
        visualStage: 'replay' as const,
        explanation:
          'The engineer clicks "Replay". The engine clears any stale atomic lease locks and resets the error flags on the payload.',
        codeOrSql: 'DELETE FROM message_claims WHERE hash_key = "0x1c8b..."; -- Revoke stale locks',
      },
      {
        stepNumber: 3,
        totalSteps: 4,
        title: 'Re-injected into Pub/Sub Stream',
        subtitle: 'Message travels along replay arc back to subscription',
        visualStage: 'replay' as const,
        explanation:
          'The repaired message is published back into the subscription topic as a fresh delivery attempt.',
        codeOrSql: 'pubsub.publish({ topic: "events-inbound", message: repairedMessage });',
      },
      {
        stepNumber: 4,
        totalSteps: 4,
        title: 'Clean Processing & Transition to ACCEPTED',
        subtitle: 'Pod claims and commits message to persistent storage',
        visualStage: 'replay' as const,
        explanation:
          'An available GKE pod polls the replayed message, acquires a fresh atomic lease, executes successfully, and commits it as ACCEPTED!',
        codeOrSql: 'UPDATE messages_store SET status = "ACCEPTED", replayed_count = 1; -- Success!',
      },
    ],
  },
];

export function SimpleArchitectureOverview() {
  const [selectedConceptIndex, setSelectedConceptIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animSpeed, setAnimSpeed] = useState<1 | 1.5 | 0.5>(1);

  const concept = CONCEPTS[selectedConceptIndex];
  const step = concept.steps[currentStepIndex];

  // Auto-play animation cycle through steps
  useEffect(() => {
    if (!isPlaying) return;

    const stepDuration = 3200 / animSpeed;
    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => {
        if (prev < concept.steps.length - 1) {
          return prev + 1;
        } else {
          return 0; // loop
        }
      });
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, concept, animSpeed]);

  const handleSelectConcept = (idx: number) => {
    setSelectedConceptIndex(idx);
    setCurrentStepIndex(0);
  };

  const handleNextStep = () => {
    setCurrentStepIndex((prev) => (prev < concept.steps.length - 1 ? prev + 1 : 0));
  };

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => (prev > 0 ? prev - 1 : concept.steps.length - 1));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-slate-100">
              Animated Architecture Overview
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Super simple, step-by-step graphical visualizer demonstrating the 4 GKE pods, 5s polling, atomic claim, unique hash idempotency, and replay flow.
          </p>
        </div>

        {/* Playback Controls Bar */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 self-start md:self-auto font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              isPlaying
                ? 'bg-amber-600/90 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Play Animation</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrevStep}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-slate-300 font-bold px-2 tabular-nums">
            Step {currentStepIndex + 1} / {concept.steps.length}
          </span>

          <button
            onClick={handleNextStep}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Speed control */}
          <button
            onClick={() => setAnimSpeed(animSpeed === 1 ? 1.5 : animSpeed === 1.5 ? 0.5 : 1)}
            className="px-2 py-1 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Animation Speed"
          >
            {animSpeed}x
          </button>
        </div>
      </div>

      {/* Concept Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CONCEPTS.map((c, idx) => {
          const isActive = selectedConceptIndex === idx;
          return (
            <button
              key={c.id}
              onClick={() => handleSelectConcept(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>{c.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-950 text-slate-500'
                }`}
              >
                {c.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step Progress Line */}
      <div className="grid grid-cols-4 gap-2">
        {concept.steps.map((st, i) => (
          <div
            key={i}
            onClick={() => setCurrentStepIndex(i)}
            className={`cursor-pointer p-2 rounded-lg border transition-all text-left ${
              currentStepIndex === i
                ? 'bg-slate-900 border-indigo-500 shadow-sm'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className={currentStepIndex === i ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
                Phase {st.stepNumber}
              </span>
              {currentStepIndex === i && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
            </div>
            <span className="text-xs font-medium text-slate-200 block truncate">
              {st.title}
            </span>
          </div>
        ))}
      </div>

      {/* Main 2D Animated Graphic Stage */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-8 shadow-2xl overflow-hidden min-h-[360px] flex flex-col justify-between">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* 2D Architecture Graphic Display */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Node 1: Pub/Sub Topic & Subscription */}
          <div
            className={`p-4 rounded-xl border transition-all duration-300 ${
              currentStepIndex === 0 || concept.id === 'polling'
                ? 'bg-cyan-950/40 border-cyan-500/70 shadow-lg shadow-cyan-950/50 scale-[1.02]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>Pub/Sub Sub</span>
              </span>
              <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                5s Poll
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100 mb-1">gke-worker-sub</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Buffers incoming stream. Releases messages every 5 seconds.
            </p>

            {/* Visual Token */}
            <div className="mt-3 p-2 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-cyan-300 flex items-center justify-between">
              <span>Msg #101 [0x8f4d...]</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          </div>

          {/* Node 2: 4 GKE Worker Pod Replicas */}
          <div
            className={`p-4 rounded-xl border transition-all duration-300 ${
              currentStepIndex === 1 || currentStepIndex === 2 || concept.id === 'claiming'
                ? 'bg-indigo-950/40 border-indigo-500/70 shadow-lg shadow-indigo-950/50 scale-[1.02]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-indigo-400 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>GKE ReplicaSet</span>
              </span>
              <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                4 Pods
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100 mb-2">Worker Pods (0 - 3)</div>

            {/* 4 mini pod indicators */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div className={`p-1.5 rounded border text-center ${currentStepIndex >= 1 ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                pod-0 (active)
              </div>
              <div className={`p-1.5 rounded border text-center ${concept.id === 'claiming' && currentStepIndex >= 2 ? 'bg-rose-950/70 border-rose-600 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                pod-1 {concept.id === 'claiming' && currentStepIndex >= 2 ? '(yield)' : '(idle)'}
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 text-center">
                pod-2 (idle)
              </div>
              <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 text-center">
                pod-3 (idle)
              </div>
            </div>
          </div>

          {/* Node 3: Intermediary Atomic Claim Engine */}
          <div
            className={`p-4 rounded-xl border transition-all duration-300 ${
              concept.id === 'claiming' || currentStepIndex === 1
                ? 'bg-purple-950/40 border-purple-500/70 shadow-lg shadow-purple-950/50 scale-[1.02]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-purple-400 font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Atomic Claim</span>
              </span>
              <span className="text-[10px] bg-slate-950 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                CAS Lock
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100 mb-1">Lease Arbiter</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Ensures exactly ONE pod acquires lease. Eliminates race conditions.
            </p>

            <div className="mt-3 p-2 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono flex items-center justify-between">
              <span className="text-purple-300 truncate">
                {concept.id === 'claiming' && currentStepIndex >= 2 ? 'Pod-0 Locked (Pod-1 Blocked)' : 'Lease: Available'}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>

          {/* Node 4: Persistent Storage with Unique Index */}
          <div
            className={`p-4 rounded-xl border transition-all duration-300 ${
              concept.id === 'idempotency' || concept.id === 'dlq' || currentStepIndex >= 3
                ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-950/50 scale-[1.02]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Persistent DB</span>
              </span>
              <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                UNIQUE(hash)
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100 mb-1">Storage Tables</div>

            <div className="space-y-1 mt-2 text-[10px] font-mono">
              <div className="p-1 rounded bg-slate-950 border border-emerald-900/60 flex justify-between text-emerald-300">
                <span>ACCEPTED</span>
                <span>Idempotent</span>
              </div>
              <div className="p-1 rounded bg-slate-950 border border-amber-900/60 flex justify-between text-amber-300">
                <span>FAILED</span>
                <span>Retry Budget</span>
              </div>
              <div className="p-1 rounded bg-slate-950 border border-rose-900/60 flex justify-between text-rose-300">
                <span>DLQ</span>
                <span>Quarantined</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Flight Beam / Signal Connector between nodes */}
        <div className="relative mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Flow Action:</span>
            <span className="text-cyan-400 font-semibold">{step.subtitle}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-300 font-sans">Active Phase {step.stepNumber} of {step.totalSteps}</span>
          </div>
        </div>
      </div>

      {/* Step Explanation Callout Card */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-mono font-bold text-indigo-400 text-xs">
              0{step.stepNumber}
            </div>
            <h3 className="text-base font-bold text-slate-100">
              {step.title}
            </h3>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Concept {selectedConceptIndex + 1} of {CONCEPTS.length}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {step.explanation}
        </p>

        {/* Technical Code / Invariant Box */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px] text-cyan-300 overflow-x-auto">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Implementation Specification &amp; Invariant
          </div>
          <code>{step.codeOrSql}</code>
        </div>
      </div>
    </div>
  );
}
