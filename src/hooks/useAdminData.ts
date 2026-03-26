import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ErrorLog, InventoryItem, SystemMetadata } from '../types';

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

    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const [metaRes, invRes, logsRes] = await Promise.all([
          supabase.from('metadata').select('data').eq('id', 'system').maybeSingle(),
          supabase.from('inventory').select('*'),
          supabase.from('error_logs').select('*').order('timestamp', { ascending: false }).limit(20)
        ]);

        if (metaRes.data) setMetadata(metaRes.data.data as SystemMetadata);
        if (invRes.data) setInventory(invRes.data as InventoryItem[]);
        if (logsRes.data) setLogs(logsRes.data as ErrorLog[]);
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
        (payload) => {
          if (payload.new) setMetadata((payload.new as any).data as SystemMetadata);
        }
      )
      .subscribe();

    const invChannel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => {
          // Re-fetch inventory on any change
          supabase.from('inventory').select('*').then(({ data }) => {
            if (data) setInventory(data as InventoryItem[]);
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
          // Re-fetch logs on insert
          supabase.from('error_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(20)
            .then(({ data }) => {
              if (data) setLogs(data as ErrorLog[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metaChannel);
      supabase.removeChannel(invChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [enabled]);

  return {
    metadata,
    inventory,
    logs,
    loading,
  };
}
