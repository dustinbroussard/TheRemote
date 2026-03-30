import { Activity, AlertTriangle, Database, ShieldAlert } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

import { cn } from '../lib/utils';
import { InventoryItem, SystemMetadata } from '../types';

function Card({
  children,
  title,
  icon: Icon,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn('bg-bg-secondary border border-bg-tertiary p-4 rounded-sm', className)}>
      {title && (
        <div className="flex items-center gap-2 mb-4 border-b border-bg-tertiary pb-2">
          {Icon && <Icon size={16} className="text-tertiary-accent" />}
          <h2 className="text-[11px] uppercase tracking-widest font-bold text-gray-400">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isRunning = status === 'Running';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight',
        isRunning
          ? 'bg-primary-accent/10 text-primary-accent border border-primary-accent/20'
          : 'bg-gray-800 text-gray-400 border border-gray-700',
      )}
    >
      <div className={cn('w-1.5 h-1.5 rounded-full', isRunning ? 'bg-primary-accent animate-pulse' : 'bg-gray-500')} />
      {status}
    </div>
  );
}

function getLowStockItems(inventory: InventoryItem[]) {
  return inventory.filter((item) => item.count < (item.threshold || 50));
}

function getInventoryRows(inventory: InventoryItem[]) {
  return [...inventory].sort((left, right) => {
    const categoryCompare = left.category.localeCompare(right.category);
    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return left.difficulty.localeCompare(right.difficulty);
  });
}

export function StatusScreen({
  metadata,
  inventory,
}: {
  metadata: SystemMetadata | null;
  inventory: InventoryItem[];
}) {
  const inventoryRows = getInventoryRows(inventory);
  const lowStockItems = getLowStockItems(inventoryRows);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <Card title="Operational State" icon={Activity}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-500 uppercase mb-1">Current Status</div>
            <StatusBadge status={metadata?.status || 'Idle'} />
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Last Replenish</div>
            <div className="text-xs font-mono text-secondary-text">
              {metadata?.lastReplenishRun
                ? format(new Date(metadata.lastReplenishRun), 'MM/dd/yyyy HH:mm:ss')
                : 'N/A'}
            </div>
          </div>
        </div>

        {metadata?.lastError && (
          <div className="mt-4 p-2 bg-danger/10 border border-danger/20 rounded-sm">
            <div className="flex items-center gap-2 text-danger text-[10px] font-bold uppercase mb-1">
              <ShieldAlert size={12} />
              Last Error
            </div>
            <p className="text-[10px] font-mono text-danger/80">{metadata.lastError}</p>
          </div>
        )}
      </Card>

      <Card title="Inventory Counts" icon={Database}>
        <div className="space-y-2">
          {inventoryRows.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs italic">No inventory data available</div>
          ) : (
            inventoryRows.map((item) => {
              const threshold = item.threshold || 50;
              const isLow = item.count < threshold;

              return (
                <div
                  key={item.bucketId}
                  className="grid grid-cols-[1fr_auto] gap-3 items-center py-2 border-b border-bg-tertiary last:border-0"
                >
                  <div>
                    <div className="text-xs font-bold text-gray-200">{item.category}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-tighter">
                      {item.difficulty} • threshold {threshold}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-sm font-mono font-bold', isLow ? 'text-danger' : 'text-primary-accent')}>
                      {item.count}
                    </div>
                    <div className="text-[8px] uppercase font-bold text-gray-500">
                      {isLow ? 'Low Stock' : 'Healthy'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card title="Low Inventory Buckets" icon={AlertTriangle}>
        {lowStockItems.length === 0 ? (
          <div className="text-xs text-primary-accent font-bold uppercase">No low inventory buckets</div>
        ) : (
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div key={item.bucketId} className="flex items-center justify-between p-2 bg-danger/10 border border-danger/20 rounded-sm">
                <div>
                  <div className="text-xs font-bold text-danger">{item.category}</div>
                  <div className="text-[10px] uppercase text-danger/80">{item.difficulty}</div>
                </div>
                <div className="text-right text-[10px] font-mono text-danger">
                  {item.count}/{item.threshold || 50}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
