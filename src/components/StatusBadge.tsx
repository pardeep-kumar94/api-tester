'use client';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`status-dot status-dot-${status}`} />
      {label && <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>}
    </span>
  );
}

export function MethodTag({ method }: { method: string }) {
  const cls = method === 'GET' ? 'method-get' : method === 'DELETE' ? 'method-delete' : 'method-post';
  return <span className={`endpoint-tag ${cls}`}>{method}</span>;
}
