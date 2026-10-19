import { useState } from 'react';
import {
  Sparkles,
  Copy,
  Zap,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Sliders,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import { ActiveScenarioInfo } from '../types';

interface ControlsBarProps {
  onInjectNormal: () => void;
  onTestDuplicate: () => void;
  onTestRaceCondition: () => void;
  onTestPoisonPill: () => void;
  onReplayAllFailed: () => void;
  onReset: () => void;
  failedCount: number;
  dlqCount: number;
  pollIntervalSec: number;
  setPollIntervalSec: (sec: number) => void;
  autoTraffic: boolean;
  setAutoTraffic: (val: boolean) => void;
  activeScenario?: ActiveScenarioInfo | null;
  onCustomMessage: (payload: { eventType: string; entityId: string; amount: number; shouldFail: boolean }) => void;
}

export function ControlsBar({
  onInjectNormal,
  onTestDuplicate,
  onTestRaceCondition,
  onTestPoisonPill,
  onReplayAllFailed,
  onReset,
  failedCount,
  dlqCount,
  pollIntervalSec,
  setPollIntervalSec,
  autoTraffic,
  setAutoTraffic,
  activeScenario,
  onCustomMessage,
}: ControlsBarProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customEventType, setCustomEventType] = useState('OrderCreated');
  const [customEntityId, setCustomEntityId] = useState('ord-8831');
  const [customAmount, setCustomAmount] = useState(199.95);
  const [customShouldFail, setCustomShouldFail] = useState(false);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCustomMessage({
      eventType: customEventType,
      entityId: customEntityId || `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: Number(customAmount) || 100,
      shouldFail: customShouldFail,
    });
    setShowCustomModal(false);
  };

  const isDuplicateRunning = activeScenario?.id === 'duplicate' && activeScenario.status === 'running';
  const isRaceRunning = activeScenario?.id === 'race' && activeScenario.status === 'running';
  const isPoisonRunning = activeScenario?.id === 'poison' && activeScenario.status === 'running';
  const isReplayRunning = activeScenario?.id === 'replay' && activeScenario.status === 'running';

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Test Scenarios Group */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Interactive Scenarios:
          </span>

          <button
            onClick={onInjectNormal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-md border border-slate-700/80 transition-colors shadow-sm"
            title="Publish a standard event with a fresh unique hash key (dispatches immediately to an idle pod)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Publish Message</span>
          </button>

          <button
            onClick={onTestDuplicate}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all shadow-sm ${
              isDuplicateRunning
                ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/30'
                : 'text-amber-200 bg-amber-950/50 hover:bg-amber-900/70 border-amber-800/80'
            }`}
            title="Inject an immediate duplicate hash to prove database unique index idempotency"
          >
            {isDuplicateRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Test Duplicate Hash (Idempotency)</span>
          </button>

          <button
            onClick={onTestRaceCondition}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all shadow-sm ${
              isRaceRunning
                ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-400/30'
                : 'text-purple-200 bg-purple-950/50 hover:bg-purple-900/70 border-purple-800/80'
            }`}
            title="Dispatch same hash to Pod 0 and Pod 1 simultaneously to verify atomic lock atomicity"
          >
            {isRaceRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>Test Race Condition (Atomic Claim)</span>
          </button>

          <button
            onClick={onTestPoisonPill}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all shadow-sm ${
              isPoisonRunning
                ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-400/30'
                : 'text-rose-200 bg-rose-950/50 hover:bg-rose-900/70 border-rose-800/80'
            }`}
            title="Send an immediate failing payload that exhausts retries and routes directly to DLQ"
          >
            {isPoisonRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>Simulate Failure and DLQ</span>
          </button>

          {(failedCount > 0 || dlqCount > 0) && (
            <button
              onClick={onReplayAllFailed}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all shadow-sm ${
                isReplayRunning
                  ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400/30'
                  : 'text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/80'
              }`}
              title="Replay all failed and dead-letter messages with atomic lock reset"
            >
              {isReplayRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Replay All Failed ({failedCount + dlqCount})</span>
            </button>
          )}

          <button
            onClick={() => setShowCustomModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-md border border-slate-700/50 transition-colors"
            title="Custom Payload Creator"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Custom Payload</span>
          </button>
        </div>

        {/* Simulator Settings (Interval, Auto traffic, Reset) */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Poll Interval:</span>
            <span className="text-cyan-400 font-semibold">{pollIntervalSec.toFixed(1)}s</span>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={pollIntervalSec}
              onChange={(e) => setPollIntervalSec(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={autoTraffic}
              onChange={(e) => setAutoTraffic(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Auto Traffic</span>
          </label>

          <button
            onClick={onReset}
            className="text-slate-400 hover:text-rose-400 transition-colors"
            title="Reset Simulator to default state"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Active Scenario Live Banner (Visual proof that the scenario is firing) */}
      {activeScenario && (
        <div
          className={`px-6 py-2 border-t text-xs flex items-center justify-between gap-4 transition-all ${
            activeScenario.status === 'running'
              ? 'bg-indigo-950/60 border-indigo-800/80 text-indigo-200'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {activeScenario.status === 'running' ? (
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-400 font-mono text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running:</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed:</span>
              </span>
            )}
            <span className="font-semibold text-slate-100">{activeScenario.name}</span>
            <span className="text-slate-400 hidden sm:inline">· {activeScenario.description}</span>
          </div>

          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {activeScenario.status === 'running' ? 'Observing 2D stream...' : 'Verified invariant'}
          </span>
        </div>
      )}

      {/* Custom Message Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              <span>Inject Custom Pub/Sub Event</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Specify custom parameters. The unique cryptographic hash key will be generated deterministically from the payload.
            </p>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Event Type</label>
                <select
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="OrderCreated">OrderCreated</option>
                  <option value="PaymentSettled">PaymentSettled</option>
                  <option value="InventoryReserved">InventoryReserved</option>
                  <option value="UserSubscriptionRenewed">UserSubscriptionRenewed</option>
                  <option value="InvoiceGenerated">InvoiceGenerated</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Entity ID</label>
                <input
                  type="text"
                  value={customEntityId}
                  onChange={(e) => setCustomEntityId(e.target.value)}
                  placeholder="e.g. ord-8831"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shouldFailCheck"
                  checked={customShouldFail}
                  onChange={(e) => setCustomShouldFail(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0"
                />
                <label htmlFor="shouldFailCheck" className="text-xs text-rose-300 font-medium cursor-pointer">
                  Force processing error (simulate FAILED / DLQ escalation)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publish to Subscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
