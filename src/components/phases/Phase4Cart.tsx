'use client';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiCall } from '@/lib/api';
import { PhaseCard } from '../PhaseCard';
import { StatusBadge, MethodTag } from '../StatusBadge';
import { JsonViewer } from '../JsonViewer';

export function Phase4Cart() {
  const store = useAppStore();
  const [statusInit, setStatusInit] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusValidate, setStatusValidate] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusSave, setStatusSave] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusCheckout, setStatusCheckout] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resInit, setResInit] = useState<unknown>(null);
  const [resValidate, setResValidate] = useState<unknown>(null);
  const [resSave, setResSave] = useState<unknown>(null);
  const [resCheckout, setResCheckout] = useState<unknown>(null);
  const [guests, setGuests] = useState(1);

  const totalCents = store.cartItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const initiateCart = async () => {
    setStatusInit('loading');
    try {
      const { ok, data } = await apiCall('POST', 'order/public/carts/initiate', {
        tenant_id: store.tenantId,
        outlet_slug: store.outletSlug,
        order_type: 'dine_in',
        menu_uid: store.selectedMenuUid || store.menuUid,
      }, 'Phase 4', '4.1 Initiate Cart');
      setResInit(data);
      if (ok) {
        store.setSessionKey((data as { session_key: string }).session_key);
        setStatusInit('success');
      } else setStatusInit('error');
    } catch { setStatusInit('error'); }
  };

  const validateOrder = async () => {
    setStatusValidate('loading');
    const menuUid = store.selectedMenuUid || store.menuUid;
    try {
      const { ok, data } = await apiCall('POST', `emenu/api/v2/public/${store.outletSlug}/menus/${menuUid}/validate-order`, {
        items: store.cartItems.map((i) => ({
          menu_item_uid: i.menu_item_uid,
          price_uid: i.price_uid,
          quantity: i.quantity,
          special_instruction: i.special_instruction,
          condiment_groups: i.condiment_groups.map((g) => ({
            condiment_group_uid: g.condiment_group_uid,
            selected_options: g.selected_options.map((o) => ({
              condiment_uid: o.condiment_uid,
              quantity: o.quantity,
            })),
          })),
        })),
      }, 'Phase 4', '4.2 Validate Order');
      setResValidate(data);
      if (ok && (data as { data?: { valid: boolean } }).data?.valid) {
        setStatusValidate('success');
      } else {
        setStatusValidate('error');
      }
    } catch { setStatusValidate('error'); }
  };

  const saveCart = async () => {
    setStatusSave('loading');
    try {
      const { ok, data } = await apiCall('POST', `order/public/carts/${store.sessionKey}/save`, {
        items: store.cartItems.map((i) => ({
          ...i,
          discount_rate: 0,
        })),
        total_amount: totalCents,
        subtotal: totalCents,
        tax_amount: 0,
        service_charge_amount: 0,
        delivery_fee: 0,
        discount_amount: 0,
        special_instructions: '',
        estimated_fees: [],
        estimated_tax_breakdown: [],
      }, 'Phase 4', '4.3 Save Cart');
      setResSave(data);
      setStatusSave(ok ? 'success' : 'error');
    } catch { setStatusSave('error'); }
  };

  const checkout = async () => {
    setStatusCheckout('loading');
    const table = store.selectedTable as Record<string, unknown> | null;
    const waiterData = store.waiter as { user?: { full_name?: string; employee_id?: string } } | null;
    try {
      const { ok, data } = await apiCall('POST', `order/public/carts/${store.sessionKey}/checkout`, {
        customer: { customer_id: null, customer_reference_code: null, name: '', email: '', phone: '', special_requests: '' },
        number_of_guests: guests,
        coupon_codes: [],
        discount_amount: 0,
        dine_in_details: {
          table_id: table?.id || '',
          table_number: table?.name || '',
          number_of_guests: guests,
          table_key: table?.table_key || '',
          table_display_name: table?.display_name || '',
          seat_number: '',
          pos_table_id: table?.pos_table_id || '',
          pos_table_name: table?.pos_table_name || '',
          waiter_id: null,
          waiter_name: waiterData?.user?.full_name || '',
          employee_reference_id: store.employeeId,
        },
      }, 'Phase 4', '4.4 Checkout');
      setResCheckout(data);
      if (ok) {
        const d = data as { order_number?: string };
        if (d.order_number) store.setOrderNumber(d.order_number);
        store.setSessionKey('');
        setStatusCheckout('success');
      } else setStatusCheckout('error');
    } catch { setStatusCheckout('error'); }
  };

  return (
    <PhaseCard phase="04" title="Place Order (Cart)" active={statusCheckout === 'success'}>
      <div className="space-y-4">
        {/* Cart items */}
        <div>
          <span className="label">Cart Items ({store.cartItems.length})</span>
          {store.cartItems.length === 0 ? (
            <div className="text-[11px] py-2" style={{ color: 'var(--text-muted)' }}>No items. Add items from Phase 3.</div>
          ) : (
            <div className="space-y-1 mt-1">
              {store.cartItems.map((item, i) => (
                <div key={i} className="py-1 px-2 border border-[var(--border)]" style={{ borderRadius: '2px' }}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px]">
                      <span>{item.menu_item_name}</span>
                      <span className="ml-2" style={{ color: 'var(--accent-yellow)' }}>
                        {(item.unit_price / 100).toFixed(2)} x {item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-[10px] px-1 border border-[var(--border)] cursor-pointer"
                        style={{ background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                        onClick={() => store.updateCartItem(i, { ...item, quantity: Math.max(1, item.quantity - 1) })}
                      >-</button>
                      <span className="text-[11px] w-4 text-center">{item.quantity}</span>
                      <button
                        className="text-[10px] px-1 border border-[var(--border)] cursor-pointer"
                        style={{ background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                        onClick={() => store.updateCartItem(i, { ...item, quantity: item.quantity + 1 })}
                      >+</button>
                      <button
                        className="text-[10px] px-1 cursor-pointer"
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', fontFamily: 'inherit' }}
                        onClick={() => store.removeCartItem(i)}
                      >×</button>
                    </div>
                  </div>
                  {item.condiment_groups.length > 0 && (
                    <div className="mt-1 pl-2 border-l-2 border-[var(--accent-purple)]" style={{ borderLeftColor: 'rgba(136, 85, 255, 0.3)' }}>
                      {item.condiment_groups.map((g) => (
                        <div key={g.condiment_group_uid} className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--accent-purple)' }}>{g.condiment_group_name}:</span>{' '}
                          {g.selected_options.map((o) => (
                            <span key={o.condiment_uid}>
                              {o.condiment_name}{o.quantity > 1 ? ` x${o.quantity}` : ''}
                              {o.price > 0 ? ` (+${(o.price / 100).toFixed(2)})` : ''}
                            </span>
                          )).reduce<React.ReactNode[]>((acc, el, idx) => idx === 0 ? [el] : [...acc, ', ', el], [])}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="text-right text-[12px] pt-1" style={{ color: 'var(--accent-green)' }}>
                Total: {(totalCents / 100).toFixed(2)} AED
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label">Number of Guests</label>
          <input className="input-field w-20" type="number" min="1" value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 1)} />
        </div>

        {/* 4.1 Initiate */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/order/public/carts/initiate</span></div>
            <StatusBadge status={statusInit} label={statusInit} />
          </div>
          <button className="btn" onClick={initiateCart} disabled={statusInit === 'loading' || store.cartItems.length === 0}>4.1 — Initiate Cart</button>
          {store.sessionKey && <div className="text-[10px] mt-1" style={{ color: 'var(--accent-cyan)' }}>Session: {store.sessionKey}</div>}
          <JsonViewer data={resInit} label="Response" />
        </div>

        {/* 4.2 Validate */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/emenu/.../validate-order</span></div>
            <StatusBadge status={statusValidate} label={statusValidate} />
          </div>
          <button className="btn" onClick={validateOrder} disabled={statusValidate === 'loading' || store.cartItems.length === 0}>4.2 — Validate Order</button>
          <JsonViewer data={resValidate} label="Response" />
        </div>

        {/* 4.3 Save */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/order/public/carts/{'{key}'}/save</span></div>
            <StatusBadge status={statusSave} label={statusSave} />
          </div>
          <button className="btn" onClick={saveCart} disabled={statusSave === 'loading' || !store.sessionKey}>4.3 — Save Cart</button>
          <JsonViewer data={resSave} label="Response" />
        </div>

        {/* 4.4 Checkout */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><MethodTag method="POST" /><span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/order/public/carts/{'{key}'}/checkout</span></div>
            <StatusBadge status={statusCheckout} label={statusCheckout} />
          </div>
          <button className="btn-primary btn" onClick={checkout} disabled={statusCheckout === 'loading' || !store.sessionKey}>4.4 — Checkout</button>
          {store.orderNumber && <div className="text-[11px] mt-1" style={{ color: 'var(--accent-green)' }}>Order: {store.orderNumber}</div>}
          <JsonViewer data={resCheckout} label="Response" />
        </div>
      </div>
    </PhaseCard>
  );
}
