'use client';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiCall } from '@/lib/api';
import { PhaseCard } from '../PhaseCard';
import { StatusBadge, MethodTag } from '../StatusBadge';
import { JsonViewer } from '../JsonViewer';

export function Phase1Setup() {
  const store = useAppStore();
  const [status1, setStatus1] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [status2, setStatus2] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [res1, setRes1] = useState<unknown>(null);
  const [res2, setRes2] = useState<unknown>(null);

  const verifyRestaurant = async () => {
    setStatus1('loading');
    try {
      const { ok, data } = await apiCall('GET', `reservation/public/api/${store.outletSlug}`, null, 'Phase 1', '1.1 Verify Restaurant');
      setRes1(data);
      if (ok) {
        const d = data as Record<string, unknown>;
        store.setRestaurant(d);
        if (d.tenant_id) store.setConfig('tenantId', d.tenant_id as string);
        if (d.pos_config) store.setPosConfig(d.pos_config as { org_id: string; loc_ref: string; rvc_ref: string });
        setStatus1('success');
      } else {
        setStatus1('error');
      }
    } catch { setStatus1('error'); }
  };

  const verifyEmployee = async () => {
    setStatus2('loading');
    try {
      const { ok, data } = await apiCall('POST', 'user/public/verify-employee-id', {
        tenant_id: store.tenantId,
        employee_id: store.employeeId,
        outlet_slug: store.outletSlug,
      }, 'Phase 1', '1.2 Verify Employee');
      setRes2(data);
      if (ok) {
        store.setWaiter(data as Record<string, unknown>);
        setStatus2('success');
      } else {
        setStatus2('error');
      }
    } catch { setStatus2('error'); }
  };

  return (
    <PhaseCard phase="01" title="App Setup" active={status1 === 'success' || status2 === 'success'}>
      <div className="space-y-4">
        {/* Config fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Base URL</label>
            <input className="input-field" value={store.baseUrl} onChange={(e) => store.setConfig('baseUrl', e.target.value)} />
          </div>
          <div>
            <label className="label">Outlet Slug</label>
            <input className="input-field" value={store.outletSlug} onChange={(e) => store.setConfig('outletSlug', e.target.value)} />
          </div>
          <div>
            <label className="label">Tenant ID</label>
            <input className="input-field" value={store.tenantId} onChange={(e) => store.setConfig('tenantId', e.target.value)} />
          </div>
          <div>
            <label className="label">Employee ID</label>
            <input className="input-field" value={store.employeeId} onChange={(e) => store.setEmployeeId(e.target.value)} />
          </div>
        </div>

        {/* Step 1.1 */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MethodTag method="GET" />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/reservation/public/api/{'{slug}'}</span>
            </div>
            <StatusBadge status={status1} label={status1} />
          </div>
          <button className="btn" onClick={verifyRestaurant} disabled={status1 === 'loading'}>
            {status1 === 'loading' ? 'Verifying...' : '1.1 — Verify Restaurant'}
          </button>
          <JsonViewer data={res1} label="Response" />
        </div>

        {/* Step 1.2 */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MethodTag method="POST" />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/user/public/verify-employee-id</span>
            </div>
            <StatusBadge status={status2} label={status2} />
          </div>
          <button className="btn" onClick={verifyEmployee} disabled={status2 === 'loading'}>
            {status2 === 'loading' ? 'Verifying...' : '1.2 — Verify Employee'}
          </button>
          <JsonViewer data={res2} label="Response" />
        </div>
      </div>
    </PhaseCard>
  );
}
