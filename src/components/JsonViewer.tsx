'use client';
import { useState } from 'react';

export function JsonViewer({ data, label }: { data: unknown; label?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const preview = json.length > 200 ? json.slice(0, 200) + '...' : json;

  return (
    <div className="mt-2">
      {label && <span className="label">{label}</span>}
      <div className="json-viewer" style={{ maxHeight: expanded ? '600px' : '120px' }}>
        {expanded ? json : preview}
      </div>
      {json.length > 200 && (
        <button
          className="text-[10px] mt-1 uppercase tracking-wider"
          style={{ color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▲ Collapse' : '▼ Expand full response'}
        </button>
      )}
    </div>
  );
}
