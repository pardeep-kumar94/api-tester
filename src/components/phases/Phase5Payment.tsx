'use client';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiCall } from '@/lib/api';
import { PhaseCard } from '../PhaseCard';
import { StatusBadge, MethodTag } from '../StatusBadge';
import { JsonViewer } from '../JsonViewer';

interface Split {
  payment_id: string;
  amount: number;
  tip_amount: number;
  status: string;
  idempotency_key: string;
}

export function Phase5Payment() {
  const store = useAppStore();
  const [statusInit, setStatusInit] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusSplits, setStatusSplits] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusLock, setStatusLock] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusComplete, setStatusComplete] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusClear, setStatusClear] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resInit, setResInit] = useState<unknown>(null);
  const [resSplits, setResSplits] = useState<unknown>(null);
  const [resLock, setResLock] = useState<unknown>(null);
  const [resComplete, setResComplete] = useState<unknown>(null);
  const [resClear, setResClear] = useState<unknown>(null);

  const [splitCount, setSplitCount] = useState(1);
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'failed' | 'cancelled'>('paid');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [maskedCard, setMaskedCard] = useState('****1234');
  const [cardHolder, setCardHolder] = useState('TEST USER');

  const splits = store.splits as Split[];
  const currentSplit = splits[store.currentSplitIndex];

  const initiatePayment = async () => {
    setStatusInit('loading');
    try {
      const { ok, data } = await apiCall('POST', `order/public/a2a/${store.orderNumber}/payments/initiate`, null, 'Phase 5', '5.1 Initiate Payment');
      setResInit(data);
      if (ok) {
        store.setIdempotencySessionKey((data as { idempotency_session_key: string }).idempotency_session_key);
        setStatusInit('success');
      } else setStatusInit('error');
    } catch { setStatusInit('error'); }
  };

  const createSplits = async () => {
    setStatusSplits('loading');
    const waiterData = store.waiter as { user?: { full_name?: string; employee_id?: string } } | null;
    const orderData = store.orderData as { order?: { total_amount?: number } } | null;
    const totalCents = store.cartItems.length > 0
      ? store.cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
      : (orderData?.order?.total_amount ? Math.round(orderData.order.total_amount * 100) : 0);

    const splitAmount = Math.floor(totalCents / splitCount);
    const remainder = totalCents - splitAmount * splitCount;

    const splitsPayload = Array.from({ length: splitCount }, (_, i) => ({
      amount: splitAmount + (i === 0 ? remainder : 0),
      tip_amount: i === 0 ? tipAmount : 0,
      items: [],
    }));

    try {
      const { ok, data } = await apiCall('POST', `order/public/a2a/${store.orderNumber}/payments/splits`, {
        split_type: 'SPLIT_BY_AMOUNT',
        idempotency_session_key: store.idempotencySessionKey,
        splits: splitsPayload,
        customer_info: { customer_reference_code: '', name: '', email: '', phone: '' },
        waiter_info: {
          waiter_id: store.employeeId,
          waiter_name: waiterData?.user?.full_name || '',
          employee_reference_code: store.employeeId,
          comments: '',
        },
      }, 'Phase 5', '5.2 Create Splits');
      setResSplits(data);
      if (ok) {
        const d = data as { splits: Split[] };
        store.setSplits(d.splits || []);
        store.setCurrentSplitIndex(0);
        setStatusSplits('success');
      } else setStatusSplits('error');
    } catch { setStatusSplits('error'); }
  };

  const lockPayment = async () => {
    if (!currentSplit) return;
    setStatusLock('loading');
    try {
      const { ok, data } = await apiCall('POST', `order/public/a2a/${store.orderNumber}/payments/${currentSplit.idempotency_key}/lock`, {
        action: 'sale',
        amount_charged: currentSplit.amount + (tipAmount || 0),
        tip_amount: tipAmount,
      }, 'Phase 5', '5.3 Lock Payment');
      setResLock(data);
      setStatusLock(ok ? 'success' : 'error');
    } catch { setStatusLock('error'); }
  };

  const completePayment = async () => {
    if (!currentSplit) return;
    setStatusComplete('loading');
    const lockData = resLock as { payment_id?: string } | null;
    try {
      const body: Record<string, unknown> = {
        status: paymentStatus,
        amount_charged: paymentStatus === 'paid' ? currentSplit.amount + tipAmount : 0,
        tip_amount: paymentStatus === 'paid' ? tipAmount : 0,
        payment_id: lockData?.payment_id || currentSplit.payment_id,
        transaction_timestamp: new Date().toISOString(),
        terminal_response: {},
        payment_method: paymentMethod,
      };
      if (paymentStatus === 'paid') {
        body.masked_card_number = maskedCard;
        body.card_holder_name = cardHolder;
        body.merchant_reference = '';
        body.terminal_id = '';
        body.transaction_ref = '';
        body.failure_reason = null;
        body.receipt_data = '';
      } else {
        body.failure_reason = paymentStatus === 'failed' ? 'Card declined' : 'User cancelled';
      }

      const { ok, data } = await apiCall('POST', `order/public/a2a/${store.orderNumber}/payments/${currentSplit.idempotency_key}/complete`, body, 'Phase 5', '5.4 Complete Payment');
      setResComplete(data);
      if (ok) {
        store.addPaymentResult(data);
        if (store.currentSplitIndex < splits.length - 1) {
          store.setCurrentSplitIndex(store.currentSplitIndex + 1);
          setStatusLock('idle');
          setResLock(null);
          setStatusComplete('idle');
          setResComplete(null);
        }
        setStatusComplete('success');
      } else setStatusComplete('error');
    } catch { setStatusComplete('error'); }
  };

  const clearSplits = async () => {
    setStatusClear('loading');
    try {
      const { ok, data } = await apiCall('DELETE', `order/public/a2a/${store.orderNumber}/payments/splits`, null, 'Phase 5', '5.5 Clear Splits');
      setResClear(data);
      if (ok) {
        store.setSplits([]);
        store.setCurrentSplitIndex(0);
        setStatusSplits('idle');
        setResSplits(null);
        setStatusLock('idle');
        setResLock(null);
        setStatusComplete('idle');
        setResComplete(null);
        setStatusClear('success');
      } else setStatusClear('error');
    } catch { setStatusClear('error'); }
  };

  return (
    <PhaseCard phase="05" title="Payment (A2A)" active={statusComplete === 'success'}>
      <div className="space-y-4">
        {!store.orderNumber && (
          <div className="text-[11px] py-2" style={{ color: 'var(--text-muted)' }}>Complete Phase 4 checkout or load an order from Phase 6 first.</div>
        )}

        {/* 5.1 Initiate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/.../{'{order}'}/payments/initiate</span></div>
            <StatusBadge status={statusInit} label={statusInit} />
          </div>
          <button className="btn" onClick={initiatePayment} disabled={!store.orderNumber || statusInit === 'loading'}>5.1 — Initiate Payment</button>
          {store.idempotencySessionKey && <div className="text-[10px] mt-1" style={{ color: 'var(--accent-cyan)' }}>Session: {store.idempotencySessionKey.slice(0, 20)}...</div>}
          <JsonViewer data={resInit} label="Response" />
        </div>

        {/* Split config */}
        <div className="border-t border-[var(--border)] pt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="label">Split Count</label>
            <input className="input-field" type="number" min="1" max="10" value={splitCount} onChange={(e) => setSplitCount(parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <label className="label">Tip (cents)</label>
            <input className="input-field" type="number" min="0" value={tipAmount} onChange={(e) => setTipAmount(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>

        {/* 5.2 Create Splits */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/.../{'{order}'}/payments/splits</span></div>
            <StatusBadge status={statusSplits} label={statusSplits} />
          </div>
          <button className="btn" onClick={createSplits} disabled={!store.idempotencySessionKey || statusSplits === 'loading'}>5.2 — Create Splits</button>
          {splits.length > 0 && (
            <div className="mt-2 space-y-1">
              {splits.map((s, i) => (
                <div key={s.idempotency_key} className={`text-[10px] px-2 py-1 border ${i === store.currentSplitIndex ? 'border-[var(--accent-green)] text-[var(--accent-green)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`} style={{ borderRadius: '2px' }}>
                  Split {i + 1}: {(s.amount / 100).toFixed(2)} AED — {s.status}
                </div>
              ))}
            </div>
          )}
          <JsonViewer data={resSplits} label="Response" />
        </div>

        {/* 5.3 Lock */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/.../{'{key}'}/lock</span></div>
            <StatusBadge status={statusLock} label={statusLock} />
          </div>
          <button className="btn" onClick={lockPayment} disabled={!currentSplit || statusLock === 'loading'}>
            5.3 — Lock Split {store.currentSplitIndex + 1}
          </button>
          <JsonViewer data={resLock} label="Response" />
        </div>

        {/* Complete config */}
        <div className="border-t border-[var(--border)] pt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="label">Payment Result</label>
            <select className="input-field" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'failed' | 'cancelled')}>
              <option value="paid">Paid (Success)</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="label">Masked Card</label>
            <input className="input-field" value={maskedCard} onChange={(e) => setMaskedCard(e.target.value)} />
          </div>
          <div>
            <label className="label">Card Holder</label>
            <input className="input-field" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
          </div>
        </div>

        {/* 5.4 Complete */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/.../{'{key}'}/complete</span></div>
            <StatusBadge status={statusComplete} label={statusComplete} />
          </div>
          <button className="btn-primary btn" onClick={completePayment} disabled={statusLock !== 'success' || statusComplete === 'loading'}>
            5.4 — Complete Split {store.currentSplitIndex + 1}
          </button>
          <JsonViewer data={resComplete} label="Response" />
        </div>

        {/* 5.5 Clear */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="DELETE" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/.../{'{order}'}/payments/splits</span></div>
            <StatusBadge status={statusClear} label={statusClear} />
          </div>
          <button className="btn btn-danger" onClick={clearSplits} disabled={!store.orderNumber || statusClear === 'loading'}>5.5 — Clear Splits</button>
          <JsonViewer data={resClear} label="Response" />
        </div>
      </div>
    </PhaseCard>
  );
}
