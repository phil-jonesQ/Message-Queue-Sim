import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PodReplica,
  PubSubMessage,
  StorageRecord,
  ClaimRecord,
  AuditEvent,
  SimPacket,
  ActiveScenarioInfo,
} from '../types';
import { sha256Hex, generateMessagePayload } from '../utils/crypto';

const DEFAULT_POLL_INTERVAL = 5.0; // 5 seconds per user prompt

const INITIAL_PODS: PodReplica[] = [
  {
    id: 'worker-pod-0',
    replicaIndex: 0,
    status: 'IDLE',
    currentMessageId: null,
    currentMessageHash: null,
    processedCount: 14,
    blockedDuplicateCount: 2,
    failedCount: 1,
    uptimeSeconds: 3820,
    cpuLoad: 24,
    memoryUsageMb: 184,
    lastPollTimestamp: null,
    ipAddress: '10.244.1.42',
    nodeName: 'gke-cluster-node-pool-1-a89c',
  },
  {
    id: 'worker-pod-1',
    replicaIndex: 1,
    status: 'IDLE',
    currentMessageId: null,
    currentMessageHash: null,
    processedCount: 16,
    blockedDuplicateCount: 3,
    failedCount: 0,
    uptimeSeconds: 3820,
    cpuLoad: 28,
    memoryUsageMb: 196,
    lastPollTimestamp: null,
    ipAddress: '10.244.2.19',
    nodeName: 'gke-cluster-node-pool-1-b44f',
  },
  {
    id: 'worker-pod-2',
    replicaIndex: 2,
    status: 'IDLE',
    currentMessageId: null,
    currentMessageHash: null,
    processedCount: 12,
    blockedDuplicateCount: 1,
    failedCount: 2,
    uptimeSeconds: 3820,
    cpuLoad: 21,
    memoryUsageMb: 178,
    lastPollTimestamp: null,
    ipAddress: '10.244.3.77',
    nodeName: 'gke-cluster-node-pool-1-c12e',
  },
  {
    id: 'worker-pod-3',
    replicaIndex: 3,
    status: 'IDLE',
    currentMessageId: null,
    currentMessageHash: null,
    processedCount: 15,
    blockedDuplicateCount: 2,
    failedCount: 1,
    uptimeSeconds: 3820,
    cpuLoad: 26,
    memoryUsageMb: 190,
    lastPollTimestamp: null,
    ipAddress: '10.244.4.88',
    nodeName: 'gke-cluster-node-pool-1-d901',
  },
];

const INITIAL_STORAGE_RECORDS: StorageRecord[] = [
  {
    id: 'msg-seed-101',
    hashKey: '0x8f4d92a1b7e6c384a51f09c2d3e4b5a6',
    status: 'ACCEPTED',
    payloadSummary: 'OrderCreated: ord-9042 ($184.00)',
    payloadJson: JSON.stringify({ eventType: 'OrderCreated', entityId: 'ord-9042', amount: 184, customerId: 'cust-482' }, null, 2),
    attemptCount: 1,
    claimedByPodId: 'worker-pod-1',
    polledAt: Date.now() - 45000,
    claimedAt: Date.now() - 44500,
    completedAt: Date.now() - 43800,
    executionDurationMs: 700,
    replayedCount: 0,
    idempotencyEnforced: true,
    duplicateEncounterCount: 1,
  },
  {
    id: 'msg-seed-102',
    hashKey: '0x3b7c4a1e9f82d560c41a29b8e7d3f015',
    status: 'ACCEPTED',
    payloadSummary: 'PaymentSettled: pay-3810 ($420.50)',
    payloadJson: JSON.stringify({ eventType: 'PaymentSettled', entityId: 'pay-3810', amount: 420.5, customerId: 'cust-891' }, null, 2),
    attemptCount: 1,
    claimedByPodId: 'worker-pod-3',
    polledAt: Date.now() - 35000,
    claimedAt: Date.now() - 34500,
    completedAt: Date.now() - 33700,
    executionDurationMs: 800,
    replayedCount: 0,
    idempotencyEnforced: true,
    duplicateEncounterCount: 0,
  },
  {
    id: 'msg-seed-103',
    hashKey: '0x7e1a90c5d82f34b6e51089a7c4f3d2b1',
    status: 'FAILED',
    payloadSummary: 'InvoiceGenerated: inv-1284 ($310.00)',
    payloadJson: JSON.stringify({ eventType: 'InvoiceGenerated', entityId: 'inv-1284', amount: 310, customerId: 'cust-205', shouldFail: true, failReason: 'Downstream tax calculating service 503' }, null, 2),
    attemptCount: 2,
    claimedByPodId: 'worker-pod-0',
    polledAt: Date.now() - 25000,
    claimedAt: Date.now() - 24600,
    completedAt: Date.now() - 23900,
    executionDurationMs: 700,
    errorReason: 'Downstream tax calculating service 503 Gateway Timeout',
    replayedCount: 0,
    idempotencyEnforced: true,
    duplicateEncounterCount: 0,
  },
  {
    id: 'msg-seed-104',
    hashKey: '0x1c8b9d3e5f20a741b6c8e9f2a0d4c781',
    status: 'DLQ',
    payloadSummary: 'InventoryReserved: inv-9941 (Corrupt Schema)',
    payloadJson: JSON.stringify({ eventType: 'InventoryReserved', entityId: 'inv-9941', metadata: { corruptKey: true }, shouldFail: true, failReason: 'Schema invariant violated: missing SKU array' }, null, 2),
    attemptCount: 3,
    claimedByPodId: 'worker-pod-2',
    polledAt: Date.now() - 15000,
    claimedAt: Date.now() - 14600,
    completedAt: Date.now() - 13800,
    executionDurationMs: 800,
    errorReason: 'Max retries exceeded (3/3): Schema invariant violated: missing SKU array',
    replayedCount: 0,
    idempotencyEnforced: true,
    duplicateEncounterCount: 0,
  },
];

export function usePubSubSimulator() {
  const [isRunning, setIsRunning] = useState(true);
  const [pollIntervalSec, setPollIntervalSec] = useState(DEFAULT_POLL_INTERVAL);
  const [pollCountdown, setPollCountdown] = useState(DEFAULT_POLL_INTERVAL);
  const [autoTraffic, setAutoTraffic] = useState(true);

  const [pods, setPods] = useState<PodReplica[]>(INITIAL_PODS);
  const [subscriptionBacklog, setSubscriptionBacklog] = useState<PubSubMessage[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [storageRecords, setStorageRecords] = useState<StorageRecord[]>(INITIAL_STORAGE_RECORDS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([
    {
      id: 'evt-init',
      timestamp: Date.now() - 60000,
      type: 'POLL',
      description: '4 GKE replica pods initialized with 5.0s subscription pull interval.',
      severity: 'info',
    },
    {
      id: 'evt-unique-idx',
      timestamp: Date.now() - 59000,
      type: 'ACCEPTED',
      description: 'Database schema verified: UNIQUE INDEX on idempotency hash_key enforced.',
      severity: 'success',
    },
  ]);

  const [activePackets, setActivePackets] = useState<SimPacket[]>([]);
  const [activeScenario, setActiveScenario] = useState<ActiveScenarioInfo | null>(null);

  // Synchronous ref lock map to avoid race condition state delays
  const lockMapRef = useRef<Map<string, string>>(new Map());

  // Ref tracking to prevent closure staleness
  const stateRef = useRef({
    pods,
    subscriptionBacklog,
    claims,
    storageRecords,
    pollIntervalSec,
    isRunning,
    autoTraffic,
  });

  useEffect(() => {
    stateRef.current = {
      pods,
      subscriptionBacklog,
      claims,
      storageRecords,
      pollIntervalSec,
      isRunning,
      autoTraffic,
    };
  }, [pods, subscriptionBacklog, claims, storageRecords, pollIntervalSec, isRunning, autoTraffic]);

  const addAuditEvent = useCallback((event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    setAuditEvents((prev) => [
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        ...event,
      },
      ...prev.slice(0, 99),
    ]);
  }, []);

  // Helper to spawn a packet for 2D animation
  const spawnPacket = useCallback((packet: Omit<SimPacket, 'id' | 'progress'>) => {
    const id = `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPacket: SimPacket = {
      id,
      progress: 0,
      ...packet,
    };
    setActivePackets((prev) => [...prev, newPacket]);

    const startTime = performance.now();
    const duration = 1100;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      setActivePackets((curr) =>
        curr
          .map((p) => (p.id === id ? { ...p, progress } : p))
          .filter((p) => p.id !== id || progress < 1)
      );

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, []);

  // Atomic Claim & Execution Process
  const processMessageAtPod = useCallback(
    async (pod: PodReplica, message: PubSubMessage) => {
      const { hashKey, id: msgId, payload } = message;

      // 1. Pod transitions to CLAIMING
      setPods((prev) =>
        prev.map((p) =>
          p.id === pod.id
            ? {
                ...p,
                status: 'CLAIMING',
                currentMessageId: msgId,
                currentMessageHash: hashKey,
                cpuLoad: Math.min(85, p.cpuLoad + 25),
              }
            : p
        )
      );

      spawnPacket({
        type: 'CLAIM_REQUEST',
        source: pod.id,
        target: 'storage-db',
        messageHash: hashKey,
        messageId: msgId,
      });

      addAuditEvent({
        type: 'POLL',
        podId: pod.id,
        messageId: msgId,
        hashKey,
        description: `[GKE ${pod.id}] Pulled message ${msgId}. Initiating atomic claim with hash ${hashKey.substring(0, 10)}...`,
        severity: 'info',
      });

      await new Promise((r) => setTimeout(r, 500));

      const currentRecords = stateRef.current.storageRecords;

      // Check 1: Idempotency enforcement via unique database index
      const existingAccepted = currentRecords.find(
        (r) => r.hashKey === hashKey && r.status === 'ACCEPTED'
      );

      if (existingAccepted) {
        // IDEMPOTENCY HIT!
        setStorageRecords((prev) =>
          prev.map((r) =>
            r.hashKey === hashKey
              ? { ...r, duplicateEncounterCount: (r.duplicateEncounterCount || 0) + 1 }
              : r
          )
        );

        setPods((prev) =>
          prev.map((p) =>
            p.id === pod.id
              ? {
                  ...p,
                  status: 'ACKING',
                  blockedDuplicateCount: p.blockedDuplicateCount + 1,
                  cpuLoad: Math.max(15, p.cpuLoad - 10),
                }
              : p
          )
        );

        addAuditEvent({
          type: 'IDEMPOTENCY_BLOCKED',
          podId: pod.id,
          messageId: msgId,
          hashKey,
          description: `[IDEMPOTENCY ENFORCED] Hash ${hashKey.substring(0, 10)}... already committed in persistent storage with UNIQUE INDEX. Pod safely ACKed without re-processing!`,
          severity: 'warning',
        });

        await new Promise((r) => setTimeout(r, 700));

        // Release pod back to IDLE
        setPods((prev) =>
          prev.map((p) =>
            p.id === pod.id
              ? {
                  ...p,
                  status: 'IDLE',
                  currentMessageId: null,
                  currentMessageHash: null,
                  cpuLoad: 20 + Math.floor(Math.random() * 10),
                }
              : p
          )
        );
        return;
      }

      // Check 2: Atomic lock conflict with synchronous ref lockMap
      const existingHolder = lockMapRef.current.get(hashKey);

      if (existingHolder && existingHolder !== pod.id) {
        addAuditEvent({
          type: 'CLAIM_CONFLICT',
          podId: pod.id,
          messageId: msgId,
          hashKey,
          description: `[CLAIM COLLISION] Pod ${pod.id} failed to claim hash ${hashKey.substring(0, 10)}... (already atomically locked by ${existingHolder}). Yielding execution.`,
          severity: 'warning',
        });

        setPods((prev) =>
          prev.map((p) =>
            p.id === pod.id
              ? {
                  ...p,
                  status: 'BACKOFF',
                  cpuLoad: 20,
                }
              : p
          )
        );

        await new Promise((r) => setTimeout(r, 700));

        setPods((prev) =>
          prev.map((p) =>
            p.id === pod.id
              ? { ...p, status: 'IDLE', currentMessageId: null, currentMessageHash: null }
              : p
          )
        );
        return;
      }

      // Lock Acquired! Register Atomic Claim in ref AND state
      lockMapRef.current.set(hashKey, pod.id);

      const newClaim: ClaimRecord = {
        hashKey,
        messageId: msgId,
        claimedByPodId: pod.id,
        claimTimestamp: Date.now(),
        expiresAt: Date.now() + 30000,
        isAtomicLocked: true,
        lockVersion: 1,
      };

      setClaims((prev) => [...prev.filter((c) => c.hashKey !== hashKey), newClaim]);

      setPods((prev) =>
        prev.map((p) =>
          p.id === pod.id
            ? { ...p, status: 'PROCESSING', cpuLoad: 75 + Math.floor(Math.random() * 15) }
            : p
        )
      );

      addAuditEvent({
        type: 'CLAIM_ACQUIRED',
        podId: pod.id,
        messageId: msgId,
        hashKey,
        description: `[ATOMIC LEASE ACQUIRED] Pod ${pod.id} locked hash ${hashKey.substring(0, 10)}... with lease TTL 30s. Processing payload...`,
        severity: 'info',
      });

      // Simulate business logic execution time
      const startTime = Date.now();
      await new Promise((r) => setTimeout(r, 1000));
      const durationMs = Date.now() - startTime;

      // Determine outcome: Failure or Success
      const willFail = payload.shouldFail || false;

      if (willFail) {
        const nextAttempt = message.attemptCount + 1;
        const reachedMax = nextAttempt > message.maxAttempts;

        if (reachedMax) {
          // Route to Dead Letter Queue (DLQ)
          const dlqRecord: StorageRecord = {
            id: msgId,
            hashKey,
            status: 'DLQ',
            payloadSummary: `${payload.eventType}: ${payload.entityId} (Failed ${nextAttempt - 1}/${message.maxAttempts})`,
            payloadJson: JSON.stringify(payload, null, 2),
            attemptCount: nextAttempt - 1,
            claimedByPodId: pod.id,
            polledAt: message.publishTime,
            claimedAt: newClaim.claimTimestamp,
            completedAt: Date.now(),
            executionDurationMs: durationMs,
            errorReason: payload.failReason || 'Max delivery attempts exceeded (3/3). Routed to DLQ.',
            replayedCount: 0,
            idempotencyEnforced: true,
            duplicateEncounterCount: 0,
          };

          setStorageRecords((prev) => [
            dlqRecord,
            ...prev.filter((r) => r.hashKey !== hashKey),
          ]);

          spawnPacket({
            type: 'DLQ_ROUTE',
            source: pod.id,
            target: 'dlq-storage',
            messageHash: hashKey,
            messageId: msgId,
            status: 'DLQ',
          });

          addAuditEvent({
            type: 'DLQ_MOVED',
            podId: pod.id,
            messageId: msgId,
            hashKey,
            description: `[DEAD LETTER QUEUE] Message ${msgId} exceeded max retry budget (${nextAttempt - 1}/${message.maxAttempts}). Preserved in DLQ storage for inspection & manual replay.`,
            severity: 'error',
          });
        } else {
          // Record as FAILED
          const failedRecord: StorageRecord = {
            id: msgId,
            hashKey,
            status: 'FAILED',
            payloadSummary: `${payload.eventType}: ${payload.entityId} (Attempt ${nextAttempt - 1}/${message.maxAttempts})`,
            payloadJson: JSON.stringify(payload, null, 2),
            attemptCount: nextAttempt - 1,
            claimedByPodId: pod.id,
            polledAt: message.publishTime,
            claimedAt: newClaim.claimTimestamp,
            completedAt: Date.now(),
            executionDurationMs: durationMs,
            errorReason: payload.failReason || 'Processing error during execution step',
            replayedCount: 0,
            idempotencyEnforced: true,
            duplicateEncounterCount: 0,
          };

          setStorageRecords((prev) => [
            failedRecord,
            ...prev.filter((r) => r.hashKey !== hashKey),
          ]);

          addAuditEvent({
            type: 'FAILED',
            podId: pod.id,
            messageId: msgId,
            hashKey,
            description: `[PROCESSING FAILED] Pod ${pod.id} reported failure for ${msgId} (Attempt ${nextAttempt - 1}/${message.maxAttempts}). Marked as FAILED in storage.`,
            severity: 'warning',
          });
        }

        setPods((prev) =>
          prev.map((p) =>
            p.id === pod.id
              ? {
                  ...p,
                  failedCount: p.failedCount + 1,
                  status: 'IDLE',
                  currentMessageId: null,
                  currentMessageHash: null,
                  cpuLoad: 25,
                }
              : p
          )
        );

        // Remove active claim lock
        lockMapRef.current.delete(hashKey);
        setClaims((prev) => prev.filter((c) => c.hashKey !== hashKey));
        return;
      }

      // Success: Record as ACCEPTED with Unique Index
      const acceptedRecord: StorageRecord = {
        id: msgId,
        hashKey,
        status: 'ACCEPTED',
        payloadSummary: `${payload.eventType}: ${payload.entityId} (${payload.amount ? `$${payload.amount.toFixed(2)}` : 'Processed'})`,
        payloadJson: JSON.stringify(payload, null, 2),
        attemptCount: message.attemptCount,
        claimedByPodId: pod.id,
        polledAt: message.publishTime,
        claimedAt: newClaim.claimTimestamp,
        completedAt: Date.now(),
        executionDurationMs: durationMs,
        replayedCount: 0,
        idempotencyEnforced: true,
        duplicateEncounterCount: 0,
      };

      setStorageRecords((prev) => [
        acceptedRecord,
        ...prev.filter((r) => r.hashKey !== hashKey),
      ]);

      spawnPacket({
        type: 'DB_COMMIT',
        source: pod.id,
        target: 'storage-db',
        messageHash: hashKey,
        messageId: msgId,
        status: 'ACCEPTED',
      });

      // Pod Acks message
      setPods((prev) =>
        prev.map((p) =>
          p.id === pod.id
            ? {
                ...p,
                status: 'ACKING',
                processedCount: p.processedCount + 1,
                cpuLoad: 35,
              }
            : p
        )
      );

      addAuditEvent({
        type: 'ACCEPTED',
        podId: pod.id,
        messageId: msgId,
        hashKey,
        description: `[ACCEPTED & COMMITTED] Hash ${hashKey.substring(0, 10)}... stored with UNIQUE INDEX. Pub/Sub ACK sent. Processing complete!`,
        severity: 'success',
      });

      await new Promise((r) => setTimeout(r, 600));

      // Reset pod to idle & clear lease lock
      lockMapRef.current.delete(hashKey);
      setClaims((prev) => prev.filter((c) => c.hashKey !== hashKey));

      setPods((prev) =>
        prev.map((p) =>
          p.id === pod.id
            ? {
                ...p,
                status: 'IDLE',
                currentMessageId: null,
                currentMessageHash: null,
                cpuLoad: 20 + Math.floor(Math.random() * 8),
              }
            : p
        )
      );
    },
    [addAuditEvent, spawnPacket]
  );

  // Inject a message (with optional immediate processing)
  const injectMessage = useCallback(
    async (options?: {
      eventType?: string;
      entityId?: string;
      shouldFail?: boolean;
      failReason?: string;
      overrideHash?: string;
      originalMessageId?: string;
      attemptCount?: number;
      immediateDispatch?: boolean;
    }) => {
      const payload = generateMessagePayload(options);
      const msgId = options?.originalMessageId || `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      const hashKey =
        options?.overrideHash ||
        (await sha256Hex(`${payload.eventType}:${payload.entityId}:${payload.customerId}:${msgId}`));

      const message: PubSubMessage = {
        id: msgId,
        hashKey,
        topic: 'projects/corp-prod/topics/events-inbound',
        subscription: 'projects/corp-prod/subscriptions/gke-worker-sub',
        publishTime: Date.now(),
        payload,
        attemptCount: options?.attemptCount || 1,
        maxAttempts: 3,
        originalHashKey: options?.overrideHash,
      };

      addAuditEvent({
        type: 'POLL',
        messageId: msgId,
        hashKey,
        description: `Published to Pub/Sub: ${payload.eventType} (${payload.entityId}) [Hash: ${hashKey.substring(0, 10)}...]`,
        severity: 'info',
      });

      // Immediate dispatch if requested (e.g. user clicked Publish Message)
      const idlePods = stateRef.current.pods.filter((p) => p.status === 'IDLE');
      if (idlePods.length > 0) {
        const targetPod = idlePods[0];
        spawnPacket({
          type: 'MESSAGE_DELIVERY',
          source: 'subscription',
          target: targetPod.id,
          messageHash: hashKey,
          messageId: msgId,
        });

        setTimeout(() => {
          processMessageAtPod(targetPod, message);
        }, 300);
      } else {
        setSubscriptionBacklog((prev) => [...prev, message]);
      }

      return message;
    },
    [addAuditEvent, spawnPacket, processMessageAtPod]
  );

  // Trigger 5-Second Polling Cycle
  const triggerPollCycle = useCallback(async () => {
    const activePods = stateRef.current.pods.filter(
      (p) => p.status === 'IDLE'
    );

    setPollCountdown(stateRef.current.pollIntervalSec);

    if (activePods.length === 0) {
      addAuditEvent({
        type: 'POLL',
        description: `[POLL TICK 5s] All 4 GKE pods are currently busy with active claims. Skipping pull until next interval.`,
        severity: 'info',
      });
      return;
    }

    // Visual polling pulse packet from pods to subscription
    activePods.forEach((pod) => {
      spawnPacket({
        type: 'POLL_REQUEST',
        source: pod.id,
        target: 'subscription',
      });
    });

    setPods((prev) =>
      prev.map((p) =>
        p.status === 'IDLE'
          ? { ...p, status: 'POLLING', lastPollTimestamp: Date.now() }
          : p
      )
    );

    await new Promise((r) => setTimeout(r, 600));

    let availableMessages = [...stateRef.current.subscriptionBacklog];

    if (availableMessages.length === 0 && stateRef.current.autoTraffic) {
      const count = Math.min(activePods.length, 1 + Math.floor(Math.random() * 3));
      const newBatch: PubSubMessage[] = [];
      for (let i = 0; i < count; i++) {
        const payload = generateMessagePayload({
          shouldFail: Math.random() < 0.15,
        });
        const msgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
        const hash = await sha256Hex(`${payload.eventType}:${payload.entityId}:${payload.customerId}:${msgId}`);
        newBatch.push({
          id: msgId,
          hashKey: hash,
          topic: 'projects/corp-prod/topics/events-inbound',
          subscription: 'projects/corp-prod/subscriptions/gke-worker-sub',
          publishTime: Date.now(),
          payload,
          attemptCount: 1,
          maxAttempts: 3,
        });
      }
      availableMessages = newBatch;
    }

    if (availableMessages.length === 0) {
      setPods((prev) =>
        prev.map((p) => (p.status === 'POLLING' ? { ...p, status: 'IDLE' } : p))
      );
      return;
    }

    const messagesToAssign = availableMessages.slice(0, activePods.length);
    const remainingBacklog = availableMessages.slice(messagesToAssign.length);
    setSubscriptionBacklog(remainingBacklog);

    messagesToAssign.forEach((msg, idx) => {
      const pod = activePods[idx];
      spawnPacket({
        type: 'MESSAGE_DELIVERY',
        source: 'subscription',
        target: pod.id,
        messageHash: msg.hashKey,
        messageId: msg.id,
      });

      setTimeout(() => {
        processMessageAtPod(pod, msg);
      }, 400);
    });
  }, [addAuditEvent, spawnPacket, processMessageAtPod]);

  // Main 100ms timer loop for 5-second countdown
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setPollCountdown((prev) => {
        const next = Math.max(0, prev - 0.1);
        if (next <= 0.05) {
          triggerPollCycle();
          return stateRef.current.pollIntervalSec;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isRunning, triggerPollCycle]);

  // Replay Mechanism: Replays a failed or DLQ message IMMEDIATELY
  const replayMessage = useCallback(
    async (hashKey: string) => {
      const record = stateRef.current.storageRecords.find((r) => r.hashKey === hashKey);
      if (!record) return;

      setActiveScenario({
        id: 'replay',
        name: 'Replaying Failed / DLQ Message',
        description: `Clearing atomic lease on ${hashKey.substring(0, 12)}..., resetting payload, and re-submitting to Pub/Sub stream.`,
        status: 'running',
        timestamp: Date.now(),
      });

      addAuditEvent({
        type: 'REPLAY_TRIGGERED',
        hashKey,
        messageId: record.id,
        description: `[REPLAY INITIATED] Replaying failed message (${record.id}) with hash ${hashKey.substring(0, 10)}... Clearing previous error state and re-submitting.`,
        severity: 'info',
      });

      // Clear any lock in ref and state
      lockMapRef.current.delete(hashKey);
      setClaims((prev) => prev.filter((c) => c.hashKey !== hashKey));

      // Mark record as replayed in storage
      setStorageRecords((prev) =>
        prev.map((r) =>
          r.hashKey === hashKey
            ? {
                ...r,
                replayedCount: (r.replayedCount || 0) + 1,
                lastReplayedAt: Date.now(),
                errorReason: undefined,
              }
            : r
        )
      );

      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(record.payloadJson);
      } catch {
        parsedPayload = {};
      }

      const repairedPayload = {
        ...parsedPayload,
        shouldFail: false,
        failReason: undefined,
        replayedAt: Date.now(),
      };

      const replayedMsg: PubSubMessage = {
        id: `replay-${record.id}-${Date.now().toString(36).substring(4)}`,
        hashKey: record.hashKey,
        topic: 'projects/corp-prod/topics/events-inbound',
        subscription: 'projects/corp-prod/subscriptions/gke-worker-sub',
        publishTime: Date.now(),
        payload: repairedPayload as unknown as PubSubMessage['payload'],
        attemptCount: 1,
        maxAttempts: 3,
      };

      spawnPacket({
        type: 'REPLAY_STREAM',
        source: 'dlq-storage',
        target: 'subscription',
        messageHash: hashKey,
        messageId: replayedMsg.id,
      });

      // Find an idle pod, or allocate Pod 0
      const targetPod =
        stateRef.current.pods.find((p) => p.status === 'IDLE') ||
        stateRef.current.pods[0];

      setTimeout(() => {
        spawnPacket({
          type: 'MESSAGE_DELIVERY',
          source: 'subscription',
          target: targetPod.id,
          messageHash: hashKey,
          messageId: replayedMsg.id,
        });

        setTimeout(async () => {
          await processMessageAtPod(targetPod, replayedMsg);
          setActiveScenario((curr) =>
            curr?.id === 'replay' ? { ...curr, status: 'completed' } : curr
          );
        }, 400);
      }, 700);
    },
    [addAuditEvent, spawnPacket, processMessageAtPod]
  );

  // Replay All Failed / DLQ records
  const replayAllFailed = useCallback(() => {
    const failedList = stateRef.current.storageRecords.filter(
      (r) => r.status === 'FAILED' || r.status === 'DLQ'
    );
    if (failedList.length === 0) return;

    setActiveScenario({
      id: 'replay',
      name: `Batch Replaying ${failedList.length} Failed Records`,
      description: 'Clearing locks and dispatching failed/DLQ records back into the Pub/Sub workers.',
      status: 'running',
      timestamp: Date.now(),
    });

    failedList.forEach((r, idx) => {
      setTimeout(() => {
        replayMessage(r.hashKey);
      }, idx * 600);
    });
  }, [replayMessage]);

  // SCENARIO 1: IMMEDIATE Duplicate Hash Collision (Idempotency Proof)
  const testDuplicateHashCollision = useCallback(async () => {
    const acceptedRecords = stateRef.current.storageRecords.filter(
      (r) => r.status === 'ACCEPTED'
    );
    const targetRecord = acceptedRecords[0] || INITIAL_STORAGE_RECORDS[0];

    setActiveScenario({
      id: 'duplicate',
      name: 'Scenario: Duplicate Hash Idempotency Test',
      description: `Dispatching duplicate hash (${targetRecord.hashKey.substring(0, 10)}...) to GKE Pod. The Database UNIQUE INDEX will block duplicate work!`,
      status: 'running',
      timestamp: Date.now(),
    });

    addAuditEvent({
      type: 'POLL',
      hashKey: targetRecord.hashKey,
      description: `[SCENARIO: DUPLICATE HASH] Injecting redelivery with already-accepted hash: ${targetRecord.hashKey.substring(0, 10)}... Watch pod verify DB UNIQUE INDEX.`,
      severity: 'warning',
    });

    const duplicateMsg: PubSubMessage = {
      id: `redelivery-${Date.now().toString(36)}`,
      hashKey: targetRecord.hashKey, // Exact duplicate hash
      topic: 'projects/corp-prod/topics/events-inbound',
      subscription: 'projects/corp-prod/subscriptions/gke-worker-sub',
      publishTime: Date.now(),
      payload: {
        eventType: 'OrderCreated',
        entityId: 'ord-duplicate-test',
        amount: 250,
        customerId: 'cust-dup',
        metadata: { isDuplicateRedelivery: true },
      },
      attemptCount: 1,
      maxAttempts: 3,
    };

    // Pick an idle pod (or pod 1)
    const targetPod =
      stateRef.current.pods.find((p) => p.status === 'IDLE') ||
      stateRef.current.pods[1];

    spawnPacket({
      type: 'MESSAGE_DELIVERY',
      source: 'subscription',
      target: targetPod.id,
      messageHash: targetRecord.hashKey,
      messageId: duplicateMsg.id,
    });

    setTimeout(async () => {
      await processMessageAtPod(targetPod, duplicateMsg);
      setActiveScenario((curr) =>
        curr?.id === 'duplicate' ? { ...curr, status: 'completed' } : curr
      );
    }, 400);
  }, [addAuditEvent, spawnPacket, processMessageAtPod]);

  // SCENARIO 2: IMMEDIATE Race Condition (2 Pods claim same hash simultaneously)
  const testRaceCondition = useCallback(async () => {
    const sharedHash = `0xrace_${Date.now().toString(16)}_atomic`;

    setActiveScenario({
      id: 'race',
      name: 'Scenario: Race Condition & Atomic Claim Test',
      description: `Dispatching identical hash ${sharedHash.substring(0, 12)} to Pod-0 and Pod-1 concurrently. Exactly ONE pod acquires lease; the other yields!`,
      status: 'running',
      timestamp: Date.now(),
    });

    // Make Pod 0 and Pod 1 available
    const podA = stateRef.current.pods[0];
    const podB = stateRef.current.pods[1];

    const raceMsgA: PubSubMessage = {
      id: `race-msg-a-${Date.now()}`,
      hashKey: sharedHash,
      topic: 'projects/corp-prod/topics/events-inbound',
      subscription: 'projects/corp-prod/subscriptions/gke-worker-sub',
      publishTime: Date.now(),
      payload: {
        eventType: 'PaymentSettled',
        entityId: 'race-atomic-check',
        amount: 500,
        customerId: 'cust-race-a',
      },
      attemptCount: 1,
      maxAttempts: 3,
    };

    const raceMsgB: PubSubMessage = {
      ...raceMsgA,
      id: `race-msg-b-${Date.now()}`,
    };

    addAuditEvent({
      type: 'POLL',
      hashKey: sharedHash,
      description: `[SCENARIO: RACE CONDITION] Dispatching shared hash ${sharedHash.substring(0, 12)} to Pod ${podA.id} and Pod ${podB.id} at the exact same instant to verify atomic lock atomicity.`,
      severity: 'info',
    });

    // Synchronously acquire lock for Pod A
    lockMapRef.current.set(sharedHash, podA.id);

    // Deliver packets to both pods simultaneously
    spawnPacket({
      type: 'MESSAGE_DELIVERY',
      source: 'subscription',
      target: podA.id,
      messageHash: sharedHash,
      messageId: raceMsgA.id,
    });
    spawnPacket({
      type: 'MESSAGE_DELIVERY',
      source: 'subscription',
      target: podB.id,
      messageHash: sharedHash,
      messageId: raceMsgB.id,
    });

    // Trigger execution
    setTimeout(() => {
      processMessageAtPod(podA, raceMsgA);
    }, 300);

    // Pod B attempts claim 100ms later and encounters synchronous lockMapRef collision
    setTimeout(async () => {
      await processMessageAtPod(podB, raceMsgB);
      setActiveScenario((curr) =>
        curr?.id === 'race' ? { ...curr, status: 'completed' } : curr
      );
    }, 450);
  }, [addAuditEvent, spawnPacket, processMessageAtPod]);

  // SCENARIO 3: IMMEDIATE Poison Pill Failure & DLQ Routing
  const testPoisonPillFailure = useCallback(async () => {
    setActiveScenario({
      id: 'poison',
      name: 'Scenario: Failure & DLQ Escalation Test',
      description: 'Dispatching malformed payload (Attempt 2/3). Failure triggers automatic escalation into Dead Letter Queue (DLQ).',
      status: 'running',
      timestamp: Date.now(),
    });

    const payload = {
      eventType: 'OrderCreated',
      entityId: `poison-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 9999,
      customerId: 'cust-poison',
      shouldFail: true,
      failReason: 'Corrupt schema: Invariant assertion failed in JSON deserializer',
    };
    const msgId = `poison-${Date.now().toString(36)}`;
    const hash = await sha256Hex(`poison:${payload.entityId}:${msgId}`);

    const poisonMsg: PubSubMessage = {
      id: msgId,
      hashKey: hash,
      topic: 'projects/corp-prod/topics/events-inbound',
      subscription: 'projects/corp-prod/subscriptions/gke-worker-sub',
      publishTime: Date.now(),
      payload,
      attemptCount: 2, // Start at attempt 2 so this failure reaches 3/3 and goes to DLQ
      maxAttempts: 3,
    };

    addAuditEvent({
      type: 'POLL',
      messageId: msgId,
      hashKey: hash,
      description: `[SCENARIO: POISON PILL] Dispatched malformed message (Attempt 2/3). Failure will immediately trigger Dead Letter Queue (DLQ) routing.`,
      severity: 'warning',
    });

    const targetPod =
      stateRef.current.pods.find((p) => p.status === 'IDLE') ||
      stateRef.current.pods[2];

    spawnPacket({
      type: 'MESSAGE_DELIVERY',
      source: 'subscription',
      target: targetPod.id,
      messageHash: hash,
      messageId: msgId,
    });

    setTimeout(async () => {
      await processMessageAtPod(targetPod, poisonMsg);
      setActiveScenario((curr) =>
        curr?.id === 'poison' ? { ...curr, status: 'completed' } : curr
      );
    }, 400);
  }, [addAuditEvent, spawnPacket, processMessageAtPod]);

  // Toggle Pod status (Healthy vs Offline)
  const togglePodHealth = useCallback((podId: string) => {
    setPods((prev) =>
      prev.map((p) => {
        if (p.id === podId) {
          const isOffline = p.status === 'OFFLINE';
          return {
            ...p,
            status: isOffline ? 'IDLE' : 'OFFLINE',
            cpuLoad: isOffline ? 20 : 0,
          };
        }
        return p;
      })
    );
  }, []);

  // Reset entire simulator
  const resetSimulator = useCallback(() => {
    lockMapRef.current.clear();
    setPods(INITIAL_PODS);
    setStorageRecords(INITIAL_STORAGE_RECORDS);
    setSubscriptionBacklog([]);
    setClaims([]);
    setActivePackets([]);
    setActiveScenario(null);
    setPollCountdown(DEFAULT_POLL_INTERVAL);
    setAuditEvents([
      {
        id: `evt-reset-${Date.now()}`,
        timestamp: Date.now(),
        type: 'POLL',
        description: 'Simulator reset to nominal initial state with 4 replica pods.',
        severity: 'info',
      },
    ]);
  }, []);

  return {
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
  };
}
