'use client';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { JsonViewer } from './JsonViewer';
import { MethodTag } from './StatusBadge';

export function ApiLogPanel() {
  const { logs, clearLogs } = useAppStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="card p-3" style={{ maxHeight: '100vh', overflow: 'auto', position: 'sticky', top: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          API Log <span style={{ color: 'var(--accent-cyan)' }}>({logs.length})</span>
        </div>
        <button
          className="text-[9px] uppercase tracking-wider cursor-pointer"
          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontFamily: 'inherit' }}
          onClick={clearLogs}
        >
          Clear
        </button>
      </div>
      <div className="space-y-1">
        {logs.length === 0 && (
          <div className="text-[10px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>No API calls yet</div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="border cursor-pointer transition-all hover:border-[var(--border-active)]"
            style={{
              borderRadius: '2px',
              borderColor: log.status && log.status >= 200 && log.status < 300 ? 'var(--border)' : log.status ? 'rgba(255,51,85,0.3)' : 'var(--border)',
              background: 'var(--bg-primary)',
            }}
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            <div className="px-2 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <MethodTag method={log.method} />
                <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{log.step}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{log.duration}ms</span>
                <span
                  className="text-[10px] font-semibold"
                  style={{
                    color: log.status && log.status >= 200 && log.status < 300 ? 'var(--accent-green)' : log.status ? 'var(--accent-red)' : 'var(--text-muted)',
                  }}
                >
                  {log.status || 'ERR'}
                </span>
              </div>
            </div>
            {expanded === log.id && (
              <div className="px-2 pb-2 space-y-1 border-t border-[var(--border)]">
                <div className="text-[9px] pt-1" style={{ color: 'var(--text-muted)' }}>{log.url}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                {log.request != null && <JsonViewer data={log.request} label="Request" />}
                {log.response != null && <JsonViewer data={log.response} label="Response" />}
                {log.error != null && <div className="text-[10px] mt-1" style={{ color: 'var(--accent-red)' }}>{String(log.error)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
