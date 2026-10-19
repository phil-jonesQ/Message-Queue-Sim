export type MessageStatus = 'ACCEPTED' | 'FAILED' | 'DLQ' | 'CLAIMED' | 'QUEUED';

export interface PubSubMessage {
  id: string;
  hashKey: string; // Unique idempotency hash key (SHA-256)
  topic: string;
  subscription: string;
  publishTime: number;
  payload: {
    eventType: string;
    entityId: string;
    amount?: number;
    customerId?: string;
    metadata?: Record<string, unknown>;
    shouldFail?: boolean;
    failReason?: string;
  };
  attemptCount: number;
  maxAttempts: number;
  originalHashKey?: string; // in case of replaying or testing duplicates
}

export interface PodReplica {
  id: string; // e.g. "worker-pod-0"
  replicaIndex: number; // 0, 1, 2, 3
  status: 'IDLE' | 'POLLING' | 'CLAIMING' | 'PROCESSING' | 'ACKING' | 'BACKOFF' | 'OFFLINE';
  currentMessageId: string | null;
  currentMessageHash: string | null;
  processedCount: number;
  blockedDuplicateCount: number;
  failedCount: number;
  uptimeSeconds: number;
  cpuLoad: number; // percentage
  memoryUsageMb: number;
  lastPollTimestamp: number | null;
  ipAddress: string;
  nodeName: string;
}

export interface ClaimRecord {
  hashKey: string;
  messageId: string;
  claimedByPodId: string;
  claimTimestamp: number;
  expiresAt: number;
  isAtomicLocked: boolean;
  lockVersion: number;
}

export interface StorageRecord {
  id: string;
  hashKey: string; // UNIQUE INDEX in persistent database
  status: 'ACCEPTED' | 'FAILED' | 'DLQ';
  payloadSummary: string;
  payloadJson: string;
  attemptCount: number;
  claimedByPodId: string;
  polledAt: number;
  claimedAt: number;
  completedAt: number;
  executionDurationMs: number;
  errorReason?: string;
  replayedCount: number;
  lastReplayedAt?: number;
  idempotencyEnforced: boolean;
  duplicateEncounterCount: number;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: 'POLL' | 'PULL_MSG' | 'CLAIM_ACQUIRED' | 'CLAIM_CONFLICT' | 'IDEMPOTENCY_BLOCKED' | 'ACCEPTED' | 'FAILED' | 'DLQ_MOVED' | 'REPLAY_TRIGGERED';
  podId?: string;
  messageId?: string;
  hashKey?: string;
  description: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export interface SimPacket {
  id: string;
  type: 'POLL_REQUEST' | 'MESSAGE_DELIVERY' | 'CLAIM_REQUEST' | 'DB_COMMIT' | 'DLQ_ROUTE' | 'REPLAY_STREAM';
  source: string; // 'subscription' | 'pod-0' | 'pod-1' | 'pod-2' | 'pod-3' | 'db' | 'dlq'
  target: string;
  progress: number; // 0 to 1
  messageHash?: string;
  messageId?: string;
  status?: MessageStatus;
}

export interface ActiveScenarioInfo {
  id: 'duplicate' | 'race' | 'poison' | 'replay' | 'publish' | null;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'idle';
  timestamp: number;
}

