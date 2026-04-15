'use client';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiCall } from '@/lib/api';
import { PhaseCard } from '../PhaseCard';
import { StatusBadge, MethodTag } from '../StatusBadge';
import { JsonViewer } from '../JsonViewer';

interface Table {
  id: string;
  name: string;
  display_name: string;
  table_key: string;
  pos_table_id: string;
  pos_table_name: string;
  seating_capacity: number;
}

interface Floor {
  id: string;
  name: string;
  tables: Table[];
}

export function Phase2Tables() {
  const store = useAppStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [res, setRes] = useState<unknown>(null);
  const [tableKey, setTableKey] = useState('');
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lookupRes, setLookupRes] = useState<unknown>(null);

  const fetchFloors = async () => {
    setStatus('loading');
    try {
      const { ok, data } = await apiCall('GET', `reservation/public/api/${store.outletSlug}/floors`, null, 'Phase 2', '2.1 Get Floors');
      setRes(data);
      if (ok) {
        store.setFloors(data as unknown[]);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch { setStatus('error'); }
  };

  const lookupTable = async () => {
    if (!tableKey) return;
    setLookupStatus('loading');
    try {
      const { ok, data } = await apiCall('GET', `reservation/public/api/${store.outletSlug}/table/${tableKey}`, null, 'Phase 2', '2.2 Lookup Table');
      setLookupRes(data);
      if (ok) {
        store.setSelectedTable(data as Record<string, unknown>);
        setLookupStatus('success');
      } else {
        setLookupStatus('error');
      }
    } catch { setLookupStatus('error'); }
  };

  const selectTable = (table: Table) => {
    store.setSelectedTable(table as unknown as Record<string, unknown>);
  };

  const floors = store.floors as Floor[];
  const selected = store.selectedTable as unknown as Table | null;

  return (
    <PhaseCard phase="02" title="Table Selection" active={!!selected}>
      <div className="space-y-4">
        {/* 2.1 Floors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MethodTag method="GET" />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/.../{'{slug}'}/floors</span>
            </div>
            <StatusBadge status={status} label={status} />
          </div>
          <button className="btn" onClick={fetchFloors} disabled={status === 'loading'}>2.1 — Get Floors & Tables</button>
          {floors.length > 0 && (
            <div className="mt-3 space-y-2">
              {floors.map((floor) => (
                <div key={floor.id}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>{floor.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {floor.tables?.map((table) => (
                      <button
                        key={table.id}
                        className={`px-3 py-2 text-[11px] border transition-all cursor-pointer ${
                          selected?.id === table.id
                            ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--glow-green)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)]'
                        }`}
                        style={{ borderRadius: '2px', background: selected?.id === table.id ? 'var(--glow-green)' : 'var(--bg-tertiary)', fontFamily: 'inherit' }}
                        onClick={() => selectTable(table)}
                      >
                        {table.display_name || table.name}
                        <span className="block text-[9px]" style={{ color: 'var(--text-muted)' }}>cap: {table.seating_capacity}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <JsonViewer data={res} label="Response" />
        </div>

        {/* 2.2 QR Lookup */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MethodTag method="GET" />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/.../{'{slug}'}/table/{'{key}'}</span>
            </div>
            <StatusBadge status={lookupStatus} label={lookupStatus} />
          </div>
          <div className="flex gap-2">
            <input className="input-field flex-1" placeholder="Table key (from QR)" value={tableKey} onChange={(e) => setTableKey(e.target.value)} />
            <button className="btn" onClick={lookupTable} disabled={lookupStatus === 'loading'}>2.2 — Lookup</button>
          </div>
          <JsonViewer data={lookupRes} label="Response" />
        </div>

        {selected && (
          <div className="border-t border-[var(--border)] pt-3">
            <span className="label">Selected Table</span>
            <div className="text-[12px]" style={{ color: 'var(--accent-green)' }}>
              {(selected as Table).display_name || (selected as Table).name} — Key: {(selected as Table).table_key} — POS: {(selected as Table).pos_table_id}
            </div>
          </div>
        )}
      </div>
    </PhaseCard>
  );
}
