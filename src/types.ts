export type SystemStatus = 'Idle' | 'Running';

export interface SystemMetadata {
  status: SystemStatus;
  lastReplenishRun?: any; // Accepting any and checking with new Date() if needed
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
  timestamp: any;
}

export interface Trigger {
  id: string;
  action: string;
  params?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  AUTH = 'auth',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo?: any;
}
