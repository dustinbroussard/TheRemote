import { Timestamp } from 'firebase/firestore';

export type SystemStatus = 'Idle' | 'Running';

export interface SystemMetadata {
  status: SystemStatus;
  lastReplenishRun?: Timestamp;
  lastError?: string;
}

export interface InventoryItem {
  bucketId: string;
  category: string;
  difficulty: string;
  count: number;
  threshold?: number;
}

export interface ErrorLog {
  id: string;
  bucketId?: string;
  stage: string;
  message: string;
  timestamp: Timestamp;
}

export interface Trigger {
  id: string;
  action: string;
  params?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
