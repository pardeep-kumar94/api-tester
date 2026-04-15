'use client';
import { ReactNode } from 'react';

export function PhaseCard({
  phase,
  title,
  active,
  error,
  children,
}: {
  phase: string;
  title: string;
  active?: boolean;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`card p-4 ${active ? 'card-active' : ''} ${error ? 'card-error' : ''}`}>
      <div className="phase-header">
        <span className="phase-number">{phase}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
