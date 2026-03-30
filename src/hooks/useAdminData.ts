import { useEffect, useState } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '../supabase';
import { ErrorLog, InventoryItem, SystemMetadata, TableStat } from '../types';

type MetadataRow = {
  id: string;
  data: SystemMetadata;
};

type InventoryRow = InventoryItem & {
  id?: string;
};

function toInventoryItem(row: InventoryRow): InventoryItem {
  return {
    bucketId: row.bucketId ?? row.id ?? `${row.category}-${row.difficulty}`,
    category: row.category,
    difficulty: row.difficulty,
    count: row.count,
    threshold: row.threshold ?? undefined,
  };
}

export function useAdminData(enabled: boolean) {
  const [metadata, setMetadata] = useState<SystemMetadata | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setMetadata(null);
      setInventory([]);
      setLogs([]);
      setTableStats([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchInitialData = async () => {
      try {
        const [metaRes, invRes, logsRes, triggersCount] = await Promise.all([
          supabase.from('metadata').select('id, data').eq('id', 'system').maybeSingle(),
          supabase.from('inventory').select('*', { count: 'exact' }),
          supabase.from('error_logs').select('*', { count: 'exact' }).order('timestamp', { ascending: false }).limit(20),
          supabase.from('triggers').select('*', { count: 'exact', head: true })
        ]);
        const metadataRow = metaRes as { data: MetadataRow | null };

        if (metadataRow.data) setMetadata(metadataRow.data.data);
        if (invRes.data) setInventory((invRes.data as InventoryRow[]).map(toInventoryItem));
        if (logsRes.data) setLogs(logsRes.data as ErrorLog[]);

        setTableStats([
          { name: 'Inventory', count: invRes.count || 0 },
          { name: 'Error Logs', count: logsRes.count || 0 },
          { name: 'Triggers', count: triggersCount.count || 0 },
          { name: 'System Metadata', count: metaRes.data ? 1 : 0 },
        ]);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to changes
    const metaChannel = supabase
      .channel('metadata-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metadata', filter: 'id=eq.system' },
        (payload: RealtimePostgresChangesPayload<MetadataRow>) => {
          if ('data' in payload.new) {
            setMetadata(payload.new.data);
          }
        }
      )
      .subscribe();

    const invChannel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => {
          supabase.from('inventory').select('*', { count: 'exact' }).then(({ data, count }) => {
            if (data) setInventory((data as InventoryRow[]).map(toInventoryItem));
            setTableStats(prev => prev.map(s => s.name === 'Inventory' ? { ...s, count: count || 0 } : s));
          });
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel('error-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'error_logs' },
        () => {
          supabase.from('error_logs')
            .select('*', { count: 'exact' })
            .order('timestamp', { ascending: false })
            .limit(20)
            .then(({ data, count }) => {
              if (data) setLogs(data as ErrorLog[]);
              setTableStats(prev => prev.map(s => s.name === 'Error Logs' ? { ...s, count: count || 0 } : s));
            });
        }
      )
      .subscribe();

    const triggerChannel = supabase
      .channel('triggers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'triggers' },
        () => {
          supabase.from('triggers').select('*', { count: 'exact', head: true }).then(({ count }) => {
            setTableStats(prev => prev.map(s => s.name === 'Triggers' ? { ...s, count: count || 0 } : s));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metaChannel);
      supabase.removeChannel(invChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(triggerChannel);
    };
  }, [enabled]);

  return {
    metadata,
    inventory,
    logs,
    tableStats,
    loading,
  };
}
