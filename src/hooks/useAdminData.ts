import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { auth, db } from '../firebase';
import { ErrorLog, FirestoreErrorInfo, InventoryItem, OperationType, SystemMetadata } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useAdminData(enabled: boolean) {
  const [metadata, setMetadata] = useState<SystemMetadata | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setMetadata(null);
      setInventory([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const metaUnsub = onSnapshot(
      doc(db, 'metadata', 'system'),
      (snapshot) => {
        setMetadata(snapshot.exists() ? (snapshot.data() as SystemMetadata) : null);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'metadata/system'),
    );

    const invUnsub = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        const items = snapshot.docs.map(
          (item) => ({ bucketId: item.id, ...item.data() }) as InventoryItem,
        );
        setInventory(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'inventory'),
    );

    const logsQuery = query(collection(db, 'error_logs'), orderBy('timestamp', 'desc'), limit(20));
    const logsUnsub = onSnapshot(
      logsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ErrorLog);
        setLogs(items);
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'error_logs'),
    );

    return () => {
      metaUnsub();
      invUnsub();
      logsUnsub();
    };
  }, [enabled]);

  return {
    metadata,
    inventory,
    logs,
    loading,
  };
}
