/**
 * Computes deterministic SHA-256 hash using the Web Crypto API
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Synchronous fallback hash for instant UI rendering if needed
 */
export function fastHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const salt = Math.abs((hash * 31) | 0).toString(16).padStart(8, '0');
  return `0x${hex}${salt}89cf21e4`;
}

export function generateRandomEntityId(prefix = 'ord'): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

export function generateMessagePayload(options?: {
  eventType?: string;
  entityId?: string;
  shouldFail?: boolean;
  failReason?: string;
}) {
  const eventTypes = [
    'OrderCreated',
    'PaymentSettled',
    'InventoryReserved',
    'UserSubscriptionRenewed',
    'InvoiceGenerated',
    'ShipmentDispatched'
  ];

  const type = options?.eventType || eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const entityId = options?.entityId || generateRandomEntityId(type.substring(0, 3).toLowerCase());
  const amount = Math.floor(25 + Math.random() * 450);
  const customerId = `cust-${Math.floor(100 + Math.random() * 900)}`;

  return {
    eventType: type,
    entityId,
    amount,
    customerId,
    metadata: {
      region: 'us-central1',
      version: 'v1.4',
      originCluster: 'gke-prod-us',
    },
    shouldFail: options?.shouldFail ?? false,
    failReason: options?.failReason || (options?.shouldFail ? 'Downstream RPC timeout during persistence' : undefined),
  };
}
