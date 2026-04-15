'use client';
import { useState } from 'react';
import { useAppStore, type CartItem } from '@/store/appStore';
import { apiCall } from '@/lib/api';
import { PhaseCard } from '../PhaseCard';
import { StatusBadge, MethodTag } from '../StatusBadge';
import { JsonViewer } from '../JsonViewer';

interface CondimentOption {
  uid: string;
  condiment_id: string;
  name: { en: string };
  price_cents: number;
  price: number;
  is_default: boolean;
  is_available: boolean;
  default_quantity: number;
  images: string[];
}

interface CondimentGroup {
  uid: string;
  name: { en: string };
  min_selections: number;
  max_selections: number;
  free_quantity: number;
  required: boolean;
  options: CondimentOption[];
}

interface MenuItem {
  uid: string;
  menu_item_id: string;
  name: { en: string };
  description: Record<string, string>;
  images: string[];
  prices: { uid: string; name: string | null; price_cents: number; price: number; is_default: boolean }[];
  condiment_groups: CondimentGroup[];
}

interface MenuSection {
  uid: string;
  name: string | { en: string };
  items: MenuItem[];
}

function resolveName(name: string | { en: string } | Record<string, string> | undefined): string {
  if (!name) return 'Unknown';
  if (typeof name === 'string') return name;
  if (typeof name === 'object' && 'en' in name) return name.en;
  return String(Object.values(name)[0] || 'Unknown');
}

interface ModifierSelection {
  [groupUid: string]: { [optionUid: string]: number };
}

function ModifierPanel({
  item,
  section,
  onAdd,
  onCancel,
}: {
  item: MenuItem;
  section: MenuSection;
  onAdd: (item: MenuItem, section: MenuSection, modifiers: ModifierSelection, priceUid: string, quantity: number) => void;
  onCancel: () => void;
}) {
  const [selections, setSelections] = useState<ModifierSelection>(() => {
    const init: ModifierSelection = {};
    for (const group of item.condiment_groups || []) {
      init[group.uid] = {};
      for (const opt of group.options) {
        if (opt.is_default) {
          init[group.uid][opt.uid] = opt.default_quantity || 1;
        }
      }
    }
    return init;
  });
  const [selectedPriceUid, setSelectedPriceUid] = useState(
    () => (item.prices.find((p) => p.is_default) || item.prices[0])?.uid || ''
  );
  const [quantity, setQuantity] = useState(1);

  const toggleOption = (groupUid: string, optionUid: string, group: CondimentGroup) => {
    setSelections((prev) => {
      const groupSel = { ...prev[groupUid] };
      if (groupSel[optionUid]) {
        delete groupSel[optionUid];
      } else {
        const currentCount = Object.keys(groupSel).length;
        if (group.max_selections > 0 && currentCount >= group.max_selections) return prev;
        groupSel[optionUid] = 1;
      }
      return { ...prev, [groupUid]: groupSel };
    });
  };

  const setOptionQty = (groupUid: string, optionUid: string, qty: number) => {
    setSelections((prev) => {
      const groupSel = { ...prev[groupUid] };
      if (qty <= 0) {
        delete groupSel[optionUid];
      } else {
        groupSel[optionUid] = qty;
      }
      return { ...prev, [groupUid]: groupSel };
    });
  };

  const selectedPrice = item.prices.find((p) => p.uid === selectedPriceUid) || item.prices[0];
  const modifierTotal = Object.entries(selections).reduce((sum, [groupUid, opts]) => {
    const group = item.condiment_groups.find((g) => g.uid === groupUid);
    if (!group) return sum;
    return sum + Object.entries(opts).reduce((s, [optUid, qty]) => {
      const opt = group.options.find((o) => o.uid === optUid);
      return s + (opt ? opt.price_cents * qty : 0);
    }, 0);
  }, 0);
  const lineTotal = (selectedPrice.price_cents + modifierTotal) * quantity;

  // Validation: check required groups have min selections
  const validationErrors: string[] = [];
  for (const group of item.condiment_groups || []) {
    const selectedCount = Object.keys(selections[group.uid] || {}).length;
    if (group.required && group.min_selections > 0 && selectedCount < group.min_selections) {
      validationErrors.push(`${resolveName(group.name)}: min ${group.min_selections} required`);
    }
  }

  return (
    <div className="mt-2 p-3 border border-[var(--accent-purple)]" style={{ borderRadius: '2px', background: 'var(--bg-primary)', boxShadow: '0 0 15px rgba(136, 85, 255, 0.1)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold" style={{ color: 'var(--accent-purple)' }}>
          Configure: {resolveName(item.name)}
        </div>
        <button
          className="text-[10px] px-2 py-0.5 cursor-pointer"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'inherit' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {/* Price selection (if multiple prices) */}
      {item.prices.length > 1 && (
        <div className="mb-3">
          <span className="label">Price / Size</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {item.prices.map((p) => (
              <button
                key={p.uid}
                className={`text-[10px] px-2 py-1 border cursor-pointer ${selectedPriceUid === p.uid ? 'border-[var(--accent-green)] text-[var(--accent-green)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
                style={{ borderRadius: '2px', background: selectedPriceUid === p.uid ? 'var(--glow-green)' : 'var(--bg-tertiary)', fontFamily: 'inherit' }}
                onClick={() => setSelectedPriceUid(p.uid)}
              >
                {p.name || 'Default'} — {(p.price_cents / 100).toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Condiment Groups */}
      {(item.condiment_groups || []).map((group) => {
        const groupSel = selections[group.uid] || {};
        const selectedCount = Object.keys(groupSel).length;
        return (
          <div key={group.uid} className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="label" style={{ marginBottom: 0 }}>{resolveName(group.name)}</span>
              {group.required && <span className="text-[8px] px-1 py-0.5 uppercase tracking-wider" style={{ color: 'var(--accent-red)', border: '1px solid rgba(255,51,85,0.3)', borderRadius: '2px' }}>Required</span>}
              <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                {group.min_selections > 0 && `min: ${group.min_selections}`}
                {group.min_selections > 0 && group.max_selections > 0 && ' / '}
                {group.max_selections > 0 && `max: ${group.max_selections}`}
                {group.max_selections === 0 && group.min_selections === 0 && 'optional'}
              </span>
              <span className="text-[8px]" style={{ color: 'var(--accent-cyan)' }}>({selectedCount} selected)</span>
            </div>
            <div className="space-y-0.5">
              {group.options.map((opt) => {
                if (!opt.is_available) return null;
                const isSelected = !!groupSel[opt.uid];
                const qty = groupSel[opt.uid] || 0;
                return (
                  <div key={opt.uid} className={`flex items-center justify-between px-2 py-1.5 border transition-all ${isSelected ? 'border-[var(--accent-purple)] bg-[rgba(136,85,255,0.06)]' : 'border-[var(--border)]'}`} style={{ borderRadius: '2px' }}>
                    <button
                      className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                      style={{ background: 'transparent', border: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }}
                      onClick={() => toggleOption(group.uid, opt.uid, group)}
                    >
                      <span className="w-3 h-3 border flex items-center justify-center shrink-0" style={{ borderRadius: '2px', borderColor: isSelected ? 'var(--accent-purple)' : 'var(--border)', background: isSelected ? 'var(--accent-purple)' : 'transparent' }}>
                        {isSelected && <span className="text-[8px]" style={{ color: 'white' }}>✓</span>}
                      </span>
                      <span className="text-[10px]">{resolveName(opt.name)}</span>
                      {opt.price_cents > 0 && (
                        <span className="text-[9px]" style={{ color: 'var(--accent-yellow)' }}>+{(opt.price_cents / 100).toFixed(2)}</span>
                      )}
                    </button>
                    {isSelected && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          className="text-[10px] w-5 h-5 flex items-center justify-center border border-[var(--border)] cursor-pointer"
                          style={{ borderRadius: '2px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                          onClick={() => setOptionQty(group.uid, opt.uid, qty - 1)}
                        >-</button>
                        <span className="text-[10px] w-4 text-center">{qty}</span>
                        <button
                          className="text-[10px] w-5 h-5 flex items-center justify-center border border-[var(--border)] cursor-pointer"
                          style={{ borderRadius: '2px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                          onClick={() => setOptionQty(group.uid, opt.uid, qty + 1)}
                        >+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quantity + Total */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="label" style={{ marginBottom: 0 }}>Qty</span>
          <button
            className="text-[10px] w-5 h-5 flex items-center justify-center border border-[var(--border)] cursor-pointer"
            style={{ borderRadius: '2px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >-</button>
          <span className="text-[11px] w-4 text-center">{quantity}</span>
          <button
            className="text-[10px] w-5 h-5 flex items-center justify-center border border-[var(--border)] cursor-pointer"
            style={{ borderRadius: '2px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
            onClick={() => setQuantity(quantity + 1)}
          >+</button>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--accent-green)' }}>
          {(lineTotal / 100).toFixed(2)} AED
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {validationErrors.map((err, i) => (
            <div key={i} className="text-[9px]" style={{ color: 'var(--accent-red)' }}>{err}</div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        className="btn btn-primary w-full mt-3"
        disabled={validationErrors.length > 0}
        onClick={() => onAdd(item, section, selections, selectedPriceUid, quantity)}
      >
        Add to Cart — {(lineTotal / 100).toFixed(2)} AED
      </button>
    </div>
  );
}

export function Phase3Menu() {
  const store = useAppStore();
  const [statusMenus, setStatusMenus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusDetail, setStatusDetail] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resMenus, setResMenus] = useState<unknown>(null);
  const [resDetail, setResDetail] = useState<unknown>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [configuringItem, setConfiguringItem] = useState<{ item: MenuItem; section: MenuSection } | null>(null);

  const fetchMenus = async () => {
    setStatusMenus('loading');
    try {
      const { ok, data } = await apiCall('GET', `emenu/api/v2/public/${store.outletSlug}/menus`, null, 'Phase 3', '3.1 Get Menus');
      setResMenus(data);
      if (ok) {
        const d = data as { data: { uid: string; name: string }[] };
        store.setMenus(d.data || []);
        if (d.data?.length > 0) store.setSelectedMenuUid(d.data[0].uid);
        setStatusMenus('success');
      } else {
        setStatusMenus('error');
      }
    } catch { setStatusMenus('error'); }
  };

  const fetchMenuDetail = async () => {
    const uid = store.selectedMenuUid || store.menuUid;
    setStatusDetail('loading');
    try {
      const { ok, data } = await apiCall('GET', `emenu/api/v2/public/${store.outletSlug}/menus/${uid}`, null, 'Phase 3', '3.2 Get Menu Detail');
      setResDetail(data);
      if (ok) {
        store.setMenuDetail((data as { data: Record<string, unknown> }).data || data as Record<string, unknown>);
        setStatusDetail('success');
      } else {
        setStatusDetail('error');
      }
    } catch { setStatusDetail('error'); }
  };

  const handleAddClick = (item: MenuItem, section: MenuSection) => {
    if (item.condiment_groups?.length > 0 || item.prices?.length > 1) {
      setConfiguringItem({ item, section });
    } else {
      addToCartSimple(item, section);
    }
  };

  const addToCartSimple = (item: MenuItem, section: MenuSection) => {
    const defaultPrice = item.prices.find((p) => p.is_default) || item.prices[0];
    if (!defaultPrice) return;

    const cartItem: CartItem = {
      menu_item_uid: item.uid,
      menu_item_name: resolveName(item.name),
      price_uid: defaultPrice.uid,
      unit_price: defaultPrice.price_cents,
      quantity: 1,
      currency: 'AED',
      menu_item_category: resolveName(section.name),
      menu_item_description: item.description?.en || '',
      menu_item_image_url: item.images?.[0] || '',
      menu_uid: store.selectedMenuUid || store.menuUid,
      menu_reference_id: '',
      special_instruction: '',
      condiment_groups: [],
      combo_group_selections: [],
    };
    store.addCartItem(cartItem);
  };

  const addToCartWithModifiers = (item: MenuItem, section: MenuSection, modifiers: ModifierSelection, priceUid: string, quantity: number) => {
    const price = item.prices.find((p) => p.uid === priceUid) || item.prices[0];
    if (!price) return;

    const condimentGroups = Object.entries(modifiers)
      .filter(([, opts]) => Object.keys(opts).length > 0)
      .map(([groupUid, opts]) => {
        const group = item.condiment_groups.find((g) => g.uid === groupUid);
        return {
          condiment_group_uid: groupUid,
          condiment_group_name: group ? resolveName(group.name) : '',
          selected_options: Object.entries(opts).map(([optUid, qty]) => {
            const opt = group?.options.find((o) => o.uid === optUid);
            return {
              condiment_uid: optUid,
              condiment_name: opt ? resolveName(opt.name) : '',
              quantity: qty,
              price: opt?.price_cents || 0,
              selected_sub_modifiers: [],
            };
          }),
        };
      });

    const cartItem: CartItem = {
      menu_item_uid: item.uid,
      menu_item_name: resolveName(item.name),
      price_uid: priceUid,
      unit_price: price.price_cents,
      quantity,
      currency: 'AED',
      menu_item_category: resolveName(section.name),
      menu_item_description: item.description?.en || '',
      menu_item_image_url: item.images?.[0] || '',
      menu_uid: store.selectedMenuUid || store.menuUid,
      menu_reference_id: '',
      special_instruction: '',
      condiment_groups: condimentGroups,
      combo_group_selections: [],
    };
    store.addCartItem(cartItem);
    setConfiguringItem(null);
  };

  const menuDetail = store.menuDetail as { sections?: MenuSection[] } | null;
  const sections = menuDetail?.sections || [];

  return (
    <PhaseCard phase="03" title="View Menu" active={statusDetail === 'success'}>
      <div className="space-y-4">
        {/* 3.1 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MethodTag method="GET" />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/emenu/.../menus</span>
            </div>
            <StatusBadge status={statusMenus} label={statusMenus} />
          </div>
          <button className="btn" onClick={fetchMenus} disabled={statusMenus === 'loading'}>3.1 — Get Menus</button>
          {(store.menus as { uid: string; name: string }[]).length > 0 && (
            <div className="mt-2">
              <label className="label">Select Menu</label>
              <select className="input-field" value={store.selectedMenuUid} onChange={(e) => store.setSelectedMenuUid(e.target.value)}>
                {(store.menus as { uid: string; name: string }[]).map((m) => (
                  <option key={m.uid} value={m.uid}>{typeof m.name === 'string' ? m.name : (m.name as unknown as {en:string})?.en || m.uid} ({m.uid.slice(0, 8)}...)</option>
                ))}
              </select>
            </div>
          )}
          <JsonViewer data={resMenus} label="Response" />
        </div>

        {/* 3.2 */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MethodTag method="GET" />
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>/emenu/.../menus/{'{uid}'}</span>
            </div>
            <StatusBadge status={statusDetail} label={statusDetail} />
          </div>
          <button className="btn" onClick={fetchMenuDetail} disabled={statusDetail === 'loading'}>3.2 — Get Menu Detail</button>

          {sections.length > 0 && (
            <div className="mt-3 space-y-1">
              <span className="label">Sections ({sections.length})</span>
              {sections.map((section) => (
                <div key={section.uid} className="border border-[var(--border)]" style={{ borderRadius: '2px' }}>
                  <button
                    className="w-full text-left px-3 py-2 text-[11px] flex justify-between items-center hover:bg-[var(--bg-tertiary)]"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', cursor: 'pointer' }}
                    onClick={() => { setExpandedSection(expandedSection === section.uid ? null : section.uid); setConfiguringItem(null); }}
                  >
                    <span>{resolveName(section.name)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{section.items?.length || 0} items {expandedSection === section.uid ? '▲' : '▼'}</span>
                  </button>
                  {expandedSection === section.uid && (
                    <div className="px-3 pb-2 space-y-1">
                      {section.items?.map((item) => {
                        const price = item.prices?.find((p) => p.is_default) || item.prices?.[0];
                        const inCart = store.cartItems.some((c) => c.menu_item_uid === item.uid);
                        const isConfiguring = configuringItem?.item.uid === item.uid;
                        const hasModifiers = item.condiment_groups?.length > 0;
                        const hasMultiplePrices = item.prices?.length > 1;
                        return (
                          <div key={item.uid}>
                            <div className={`flex items-center justify-between py-1 border-t border-[var(--border)] ${isConfiguring ? 'border-b-0' : ''}`}>
                              <div>
                                <span className="text-[11px]">{resolveName(item.name)}</span>
                                {price && (
                                  <span className="ml-2 text-[10px]" style={{ color: 'var(--accent-yellow)' }}>
                                    {(price.price_cents / 100).toFixed(2)} AED
                                  </span>
                                )}
                                {hasModifiers && (
                                  <span className="ml-1 text-[9px]" style={{ color: 'var(--accent-purple)' }}>+modifiers</span>
                                )}
                                {hasMultiplePrices && (
                                  <span className="ml-1 text-[9px]" style={{ color: 'var(--accent-cyan)' }}>{item.prices.length} prices</span>
                                )}
                              </div>
                              <button
                                className={`text-[10px] px-2 py-1 border cursor-pointer ${inCart ? 'border-[var(--accent-green)] text-[var(--accent-green)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-green)]'}`}
                                style={{ borderRadius: '2px', background: 'transparent', fontFamily: 'inherit' }}
                                onClick={() => handleAddClick(item, section)}
                              >
                                {(hasModifiers || hasMultiplePrices) ? '+ Configure' : inCart ? '+ Add more' : '+ Add'}
                              </button>
                            </div>
                            {isConfiguring && (
                              <ModifierPanel
                                item={item}
                                section={section}
                                onAdd={addToCartWithModifiers}
                                onCancel={() => setConfiguringItem(null)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <JsonViewer data={resDetail} label="Full Response" />
        </div>
      </div>
    </PhaseCard>
  );
}
