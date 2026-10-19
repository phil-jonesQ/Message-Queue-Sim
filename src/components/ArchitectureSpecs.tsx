import {
  Layers,
  Clock,
  Lock,
  ShieldCheck,
  RotateCcw,
  Database,
  Cpu,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

export function ArchitectureSpecs() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Overview Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>System Architecture and Invariants Specification</span>
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Production architecture reference for 4 horizontal GKE worker replicas polling Google Cloud Pub/Sub with atomic lease claiming, cryptographic idempotency enforcement, and persistent storage with dead-letter queue (DLQ) replay.
        </p>
      </div>

      {/* Grid of 5 Key Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 1: 4 GKE Worker Pods (Scalability) */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Cpu className="w-4 h-4" />
            <span>01. 4 GKE Worker Pod Replicas (Scalability)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Worker pods run as identical replicas within a Kubernetes <code className="text-cyan-300 font-mono">Deployment</code> / <code className="text-cyan-300 font-mono">ReplicaSet</code>.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Horizontal scalability distributes message throughput evenly across pods.</li>
            <li>If any pod terminates or restarts, surviving replicas seamlessly absorb the workload.</li>
            <li>Stateless execution: all state is externalized to persistent storage.</li>
          </ul>
        </div>

        {/* Pillar 2: 5-Second Polling Frequency */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Clock className="w-4 h-4" />
            <span>02. 5-Second Polling Cadence</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Idle worker pods poll the shared subscription on a 5.0-second timer cycle.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Prevents tight polling loops and reduces Cloud Pub/Sub API quota consumption.</li>
            <li>Supports batch pulling (<code className="text-cyan-300 font-mono">maxMessages: 10</code>) for maximum network efficiency.</li>
            <li>Configurable ack deadlines ensure messages are not prematurely redelivered.</li>
          </ul>
        </div>

        {/* Pillar 3: Atomic Claim Process */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Lock className="w-4 h-4" />
            <span>03. Atomic Message Claim Process</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Before processing business logic, a worker pod must acquire an atomic lease in persistent storage.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Implemented using serializable transactions with <code className="text-purple-300 font-mono">FOR UPDATE SKIP LOCKED</code> or conditional write leases.</li>
            <li>Prevents race conditions when redeliveries trigger concurrent claims across multiple pods.</li>
            <li>Time-to-live (TTL) leases protect against worker pod crashes during in-flight processing.</li>
          </ul>
        </div>

        {/* Pillar 4: Unique Hash Key & Idempotency */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>04. Unique Hash Key (Database Idempotency)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Every message carries a deterministic SHA-256 idempotency hash derived from its business payload.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Database schema enforces <code className="text-emerald-300 font-mono">UNIQUE INDEX idx_hash (hash_key)</code>.</li>
            <li>Duplicate redeliveries encounter the constraint violation, bypass side-effects, and safely ACK.</li>
            <li>Eliminates duplicate payments, duplicate orders, or corrupted ledgers.</li>
          </ul>
        </div>
      </div>

      {/* Pillar 5: Persistent Storage Statuses & Replay Engine */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
          <Database className="w-4 h-4" />
          <span>05. Persistent Storage Partitions and The Replay Mechanism</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-lg border border-emerald-900/50">
            <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ACCEPTED</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px]">
              Business logic executed successfully. Stored permanently with unique index. Pub/Sub ACK issued.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-amber-900/50">
            <div className="text-amber-400 font-bold mb-1 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>FAILED</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px]">
              Transient downstream failures (503, network timeouts). Attempt &lt; 3. Can be replayed on demand.
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-rose-900/50">
            <div className="text-rose-400 font-bold mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DEAD LETTER QUEUE (DLQ)</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px]">
              Exhausted retry budget (3/3) or poison pill payload. Quarantined for engineer inspection and zero data loss.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>How The Replay Mechanism Works</span>
          </div>
          <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
            When an operator clicks <strong className="text-emerald-300">Replay</strong>, the claim lease lock is atomically revoked in persistent storage, any error flags are reset, and the message payload is re-submitted into the Pub/Sub subscription. The 4 GKE pods pull it on the next 5-second interval and process it cleanly to the <code className="text-emerald-300 font-mono">ACCEPTED</code> state.
          </p>
        </div>
      </div>
    </div>
  );
}
