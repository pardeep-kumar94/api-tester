'use client';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiCall } from '@/lib/api';
import { PhaseCard } from '../PhaseCard';
import { StatusBadge, MethodTag } from '../StatusBadge';
import { JsonViewer } from '../JsonViewer';

export function Phase6Orders() {
  const store = useAppStore();
  const [statusTable, setStatusTable] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusSync, setStatusSync] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusList, setStatusList] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resTable, setResTable] = useState<unknown>(null);
  const [resSync, setResSync] = useState<unknown>(null);
  const [resList, setResList] = useState<unknown>(null);
  const [syncOrderNum, setSyncOrderNum] = useState('');
  const [listStartDate, setListStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [listEndDate, setListEndDate] = useState(new Date().toISOString().split('T')[0]);

  const table = store.selectedTable as Record<string, unknown> | null;

  const getTableOrders = async () => {
    setStatusTable('loading');
    try {
      const { ok, data } = await apiCall('POST', 'order/public/orders/table', {
        tenant_id: store.tenantId,
        restaurant_slug: store.outletSlug,
        table_key: table?.table_key || '',
        context: {
          org_id: store.posConfig?.org_id || '',
          loc_ref: store.posConfig?.loc_ref || '',
          rvc_ref: store.posConfig?.rvc_ref || '',
          pos_table_id: table?.pos_table_id || '',
          pos_table_name: table?.pos_table_name || '',
          outlet_slug: store.outletSlug,
        },
      }, 'Phase 6', '6.1 Get Table Orders');
      setResTable(data);
      if (ok) {
        store.setTableOrders(data as unknown[]);
        setStatusTable('success');
      } else setStatusTable('error');
    } catch { setStatusTable('error'); }
  };

  const syncOrder = async () => {
    const orderNum = syncOrderNum || store.orderNumber;
    if (!orderNum) return;
    setStatusSync('loading');
    try {
      const { ok, data } = await apiCall('POST', `order/public/orders/${orderNum}/sync`, {
        tenant_id: store.tenantId,
        restaurant_slug: store.outletSlug,
        table_key: table?.table_key || '',
        context: {
          org_id: store.posConfig?.org_id || '',
          loc_ref: store.posConfig?.loc_ref || '',
          rvc_ref: store.posConfig?.rvc_ref || '',
          pos_table_id: table?.pos_table_id || '',
          pos_table_name: table?.pos_table_name || '',
          outlet_slug: store.outletSlug,
        },
      }, 'Phase 6', '6.2 Sync Order');
      setResSync(data);
      if (ok) {
        store.setOrderData(data as Record<string, unknown>);
        setStatusSync('success');
      } else setStatusSync('error');
    } catch { setStatusSync('error'); }
  };

  const getOrdersList = async () => {
    setStatusList('loading');
    try {
      const params = new URLSearchParams({
        outlet_slug: store.outletSlug,
        start_timestamp: `${listStartDate}T00:00:00Z`,
        end_timestamp: `${listEndDate}T23:59:59Z`,
        limit: '50',
        offset: '0',
      });
      const { ok, data } = await apiCall('GET', `order/public/orders/list?${params}`, null, 'Phase 6', '6.3 Orders List');
      setResList(data);
      setStatusList(ok ? 'success' : 'error');
    } catch { setStatusList('error'); }
  };

  const selectOrder = (order: { order_number: string }) => {
    store.setOrderNumber(order.order_number);
    setSyncOrderNum(order.order_number);
  };

  const tableOrders = store.tableOrders as { order: { order_number: string; status: string; payment_status: string; total_amount: number; currency: string; items: { menu_item_name: string; quantity: number }[] } }[];

  return (
    <PhaseCard phase="06" title="View Orders" active={statusTable === 'success' || statusSync === 'success'}>
      <div className="space-y-4">
        {/* 6.1 Table Orders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/order/public/orders/table</span></div>
            <StatusBadge status={statusTable} label={statusTable} />
          </div>
          <button className="btn" onClick={getTableOrders} disabled={statusTable === 'loading' || !table}>6.1 — Get Table Orders</button>
          {!table && <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Select a table in Phase 2 first</div>}

          {tableOrders.length > 0 && (
            <div className="mt-2 space-y-1">
              {tableOrders.map((tw) => (
                <button
                  key={tw.order.order_number}
                  className={`w-full text-left px-3 py-2 border text-[11px] cursor-pointer ${
                    store.orderNumber === tw.order.order_number ? 'border-[var(--accent-green)] bg-[var(--glow-green)]' : 'border-[var(--border)] hover:border-[var(--accent-blue)]'
                  }`}
                  style={{ borderRadius: '2px', background: store.orderNumber === tw.order.order_number ? 'var(--glow-green)' : 'var(--bg-tertiary)', fontFamily: 'inherit', color: 'var(--text-primary)' }}
                  onClick={() => selectOrder(tw.order)}
                >
                  <div className="flex justify-between">
                    <span>{tw.order.order_number}</span>
                    <span style={{ color: tw.order.payment_status === 'paid' ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{tw.order.payment_status}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {tw.order.total_amount} {tw.order.currency} — {tw.order.items?.length || 0} items — {tw.order.status}
                  </div>
                </button>
              ))}
            </div>
          )}
          <JsonViewer data={resTable} label="Response" />
        </div>

        {/* 6.2 Sync */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/order/public/orders/{'{order}'}/sync</span></div>
            <StatusBadge status={statusSync} label={statusSync} />
          </div>
          <div className="flex gap-2 mb-2">
            <input className="input-field flex-1" placeholder="Order number" value={syncOrderNum || store.orderNumber} onChange={(e) => setSyncOrderNum(e.target.value)} />
            <button className="btn" onClick={syncOrder} disabled={statusSync === 'loading'}>6.2 — Sync Order</button>
          </div>
          <JsonViewer data={resSync} label="Response" />
        </div>

        {/* 6.3 List */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="GET" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/order/public/orders/list</span></div>
            <StatusBadge status={statusList} label={statusList} />
          </div>
          <div className="flex gap-2 mb-2">
            <div>
              <label className="label">Start Date</label>
              <input className="input-field" type="date" value={listStartDate} onChange={(e) => setListStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input className="input-field" type="date" value={listEndDate} onChange={(e) => setListEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button className="btn" onClick={getOrdersList} disabled={statusList === 'loading'}>6.3 — List Orders</button>
            </div>
          </div>
          <JsonViewer data={resList} label="Response" />
        </div>
      </div>
    </PhaseCard>
  );
}
