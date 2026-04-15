'use client';
import { Phase1Setup } from '@/components/phases/Phase1Setup';
import { Phase2Tables } from '@/components/phases/Phase2Tables';
import { Phase3Menu } from '@/components/phases/Phase3Menu';
import { Phase4Cart } from '@/components/phases/Phase4Cart';
import { Phase5Payment } from '@/components/phases/Phase5Payment';
import { Phase6Orders } from '@/components/phases/Phase6Orders';
import { ApiLogPanel } from '@/components/ApiLogPanel';
import { useAppStore } from '@/store/appStore';

export default function Home() {
  const { orderNumber, sessionKey, selectedTable, restaurant } = useAppStore();

  return (
    <div className="scanline-overlay min-h-screen">
      <div className="grid-bg" />

      {/* Top bar */}
      <header className="relative z-10 border-b border-[var(--border)] px-6 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-4">
          <div className="text-[11px] font-bold tracking-[0.3em] uppercase" style={{ color: 'var(--accent-green)' }}>
            eMenu <span style={{ color: 'var(--text-muted)' }}>API Dashboard</span>
          </div>
          <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
          <div className="text-[9px] tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>App-to-App Flow Tester</div>
        </div>
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {restaurant && <span style={{ color: 'var(--accent-green)' }}>Restaurant: OK</span>}
          {selectedTable && <span style={{ color: 'var(--accent-blue)' }}>Table: {(selectedTable as Record<string, string>).display_name || 'Selected'}</span>}
          {sessionKey && <span style={{ color: 'var(--accent-yellow)' }}>Cart: Active</span>}
          {orderNumber && <span style={{ color: 'var(--accent-purple)' }}>Order: {orderNumber}</span>}
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex">
        {/* Phases */}
        <main className="flex-1 p-6 space-y-4 max-w-[calc(100%-360px)]">
          <Phase1Setup />
          <Phase2Tables />
          <Phase3Menu />
          <Phase4Cart />
          <Phase5Payment />
          <Phase6Orders />
        </main>

        {/* Log sidebar */}
        <aside className="w-[360px] shrink-0 p-4 border-l border-[var(--border)]" style={{ background: 'var(--bg-secondary)' }}>
          <ApiLogPanel />
        </aside>
      </div>
    </div>
  );
}
