import { useState } from 'react';
import { usePubSubSimulator } from './hooks/usePubSubSimulator';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { CleanGraphicArchitectureView } from './components/CleanGraphicArchitectureView';
import { ArchitectureCanvas2D } from './components/ArchitectureCanvas2D';
import { SimpleArchitectureOverview } from './components/SimpleArchitectureOverview';
import { StorageExplorer } from './components/StorageExplorer';
import { LiveAuditStream } from './components/LiveAuditStream';
import { ArchitectureSpecs } from './components/ArchitectureSpecs';
import { MessageDetailModal } from './components/MessageDetailModal';
import { PodDetailModal } from './components/PodDetailModal';
import { StorageRecord, PodReplica } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'diagram' | 'canvas' | 'simple' | 'storage' | 'audit' | 'specs'>('diagram');
  const [selectedRecord, setSelectedRecord] = useState<StorageRecord | null>(null);
  const [selectedPod, setSelectedPod] = useState<PodReplica | null>(null);

  const {
    isRunning,
    setIsRunning,
    pollIntervalSec,
    setPollIntervalSec,
    pollCountdown,
    autoTraffic,
    setAutoTraffic,
    pods,
    subscriptionBacklog,
    claims,
    storageRecords,
    auditEvents,
    activePackets,
    activeScenario,
    triggerPollCycle,
    injectMessage,
    replayMessage,
    replayAllFailed,
    testDuplicateHashCollision,
    testRaceCondition,
    testPoisonPillFailure,
    togglePodHealth,
    resetSimulator,
  } = usePubSubSimulator();

  const failedCount = storageRecords.filter((r) => r.status === 'FAILED').length;
  const dlqCount = storageRecords.filter((r) => r.status === 'DLQ').length;

  const handleSelectHashFromAudit = (hashKey: string) => {
    const record = storageRecords.find((r) => r.hashKey === hashKey);
    if (record) {
      setSelectedRecord(record);
    } else {
      setActiveTab('storage');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract (3 zones) */}
      <Header
        isRunning={isRunning}
        onToggleRunning={() => setIsRunning(!isRunning)}
        onTriggerPoll={triggerPollCycle}
        pollCountdown={pollCountdown}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExplainer={() => setActiveTab('specs')}
      />

      {/* Interactive Scenario Launchers & Controls */}
      <ControlsBar
        onInjectNormal={() => injectMessage()}
        onTestDuplicate={testDuplicateHashCollision}
        onTestRaceCondition={testRaceCondition}
        onTestPoisonPill={testPoisonPillFailure}
        onReplayAllFailed={replayAllFailed}
        onReset={resetSimulator}
        failedCount={failedCount}
        dlqCount={dlqCount}
        pollIntervalSec={pollIntervalSec}
        setPollIntervalSec={setPollIntervalSec}
        autoTraffic={autoTraffic}
        setAutoTraffic={setAutoTraffic}
        activeScenario={activeScenario}
        onCustomMessage={(payload) => injectMessage(payload)}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'diagram' && (
          <CleanGraphicArchitectureView
            pods={pods}
            subscriptionBacklog={subscriptionBacklog}
            claims={claims}
            storageRecords={storageRecords}
            pollCountdown={pollCountdown}
            pollIntervalSec={pollIntervalSec}
            isRunning={isRunning}
            activeScenario={activeScenario}
            onToggleRunning={() => setIsRunning(!isRunning)}
            onTriggerPoll={triggerPollCycle}
            onInjectNormal={() => injectMessage()}
            onTestDuplicate={testDuplicateHashCollision}
            onTestRaceCondition={testRaceCondition}
            onTestPoisonPill={testPoisonPillFailure}
            onReplayAllFailed={replayAllFailed}
            onReplayMessage={replayMessage}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onSelectPod={(pod) => setSelectedPod(pod)}
          />
        )}

        {activeTab === 'canvas' && (
          <div className="space-y-6">
            <ArchitectureCanvas2D
              pods={pods}
              subscriptionBacklog={subscriptionBacklog}
              claims={claims}
              storageRecords={storageRecords}
              activePackets={activePackets}
              pollCountdown={pollCountdown}
              pollIntervalSec={pollIntervalSec}
              activeScenario={activeScenario}
              onSelectPod={(pod) => setSelectedPod(pod)}
              onSelectRecord={(rec) => setSelectedRecord(rec)}
              onReplayMessage={replayMessage}
              onTogglePodHealth={togglePodHealth}
            />

            {/* Quick Preview of Persistent Storage & Live Audit below Canvas */}
            <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Storage Quick Card */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-100">
                      Persistent Storage Ledger (Recent Activity)
                    </h3>
                    <button
                      onClick={() => setActiveTab('storage')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
                    >
                      View All ({storageRecords.length}) →
                    </button>
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    {storageRecords.slice(0, 4).map((r) => (
                      <div
                        key={r.hashKey}
                        onClick={() => setSelectedRecord(r)}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="truncate mr-3">
                          <span
                            className={
                              r.status === 'ACCEPTED'
                                ? 'text-emerald-300'
                                : r.status === 'FAILED'
                                ? 'text-amber-300'
                                : 'text-rose-300'
                            }
                          >
                            {r.hashKey.substring(0, 16)}...
                          </span>
                          <span className="text-slate-500 text-[11px] block truncate">
                            {r.payloadSummary}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            r.status === 'ACCEPTED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : r.status === 'FAILED'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Unique Index: <strong className="text-emerald-400">ENFORCED</strong></span>
                  <span>Duplicate Ingress: <strong className="text-purple-400">{storageRecords.reduce((acc, r) => acc + (r.duplicateEncounterCount || 0), 0)} Blocked</strong></span>
                </div>
              </div>

              {/* Live Events Quick Card */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-100">
                      Live Atomic Claim &amp; Polling Feed
                    </h3>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                    >
                      Full Audit Stream →
                    </button>
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    {auditEvents.slice(0, 4).map((evt) => (
                      <div
                        key={evt.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px]"
                      >
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <span className="tabular-nums">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span
                            className={
                              evt.severity === 'success'
                                ? 'text-emerald-400 font-bold'
                                : evt.severity === 'warning'
                                ? 'text-amber-400 font-bold'
                                : evt.severity === 'error'
                                ? 'text-rose-400 font-bold'
                                : 'text-cyan-400 font-bold'
                            }
                          >
                            {evt.type}
                          </span>
                        </div>
                        <p className="text-slate-300 font-sans truncate">
                          {evt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Cadence: <strong>5.0s Pulse</strong></span>
                  <span>Cluster: <strong>GKE us-central1 (4 Pods)</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simple' && <SimpleArchitectureOverview />}

        {activeTab === 'storage' && (
          <StorageExplorer
            records={storageRecords}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onReplayMessage={replayMessage}
            onReplayAllFailed={replayAllFailed}
          />
        )}

        {activeTab === 'audit' && (
          <LiveAuditStream
            events={auditEvents}
            onSelectHash={handleSelectHashFromAudit}
          />
        )}

        {activeTab === 'specs' && <ArchitectureSpecs />}
      </main>

      {/* Message Inspection Modal */}
      {selectedRecord && (
        <MessageDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onReplay={replayMessage}
        />
      )}

      {/* Pod Inspection Modal */}
      {selectedPod && (
        <PodDetailModal
          pod={selectedPod}
          onClose={() => setSelectedPod(null)}
          onToggleHealth={togglePodHealth}
        />
      )}
    </div>
  );
}
