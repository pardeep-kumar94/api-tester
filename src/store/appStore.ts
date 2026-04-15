import { create } from 'zustand';

export interface ApiLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number | null;
  duration: number;
  request?: unknown;
  response?: unknown;
  error?: string;
  phase: string;
  step: string;
}

export interface AppState {
  // Config
  baseUrl: string;
  outletSlug: string;
  tenantId: string;
  menuUid: string;
  machineId: string;
  imeiId: string;
  deviceId: string;

  // Restaurant
  restaurant: Record<string, unknown> | null;
  posConfig: { org_id: string; loc_ref: string; rvc_ref: string } | null;

  // Employee
  employeeId: string;
  waiter: Record<string, unknown> | null;

  // Floors & Tables
  floors: unknown[];
  selectedTable: Record<string, unknown> | null;

  // Menu
  menus: unknown[];
  selectedMenuUid: string;
  menuDetail: Record<string, unknown> | null;

  // Cart
  sessionKey: string;
  cartItems: CartItem[];

  // Order
  orderNumber: string;
  orderData: Record<string, unknown> | null;

  // Payment
  idempotencySessionKey: string;
  splits: unknown[];
  currentSplitIndex: number;
  paymentResults: unknown[];

  // Table Orders
  tableOrders: unknown[];

  // Logs
  logs: ApiLog[];

  // Actions
  setConfig: (key: string, value: string) => void;
  setRestaurant: (data: Record<string, unknown> | null) => void;
  setPosConfig: (data: { org_id: string; loc_ref: string; rvc_ref: string } | null) => void;
  setWaiter: (data: Record<string, unknown> | null) => void;
  setEmployeeId: (id: string) => void;
  setFloors: (data: unknown[]) => void;
  setSelectedTable: (data: Record<string, unknown> | null) => void;
  setMenus: (data: unknown[]) => void;
  setSelectedMenuUid: (uid: string) => void;
  setMenuDetail: (data: Record<string, unknown> | null) => void;
  setSessionKey: (key: string) => void;
  addCartItem: (item: CartItem) => void;
  removeCartItem: (index: number) => void;
  updateCartItem: (index: number, item: CartItem) => void;
  clearCart: () => void;
  setOrderNumber: (num: string) => void;
  setOrderData: (data: Record<string, unknown> | null) => void;
  setIdempotencySessionKey: (key: string) => void;
  setSplits: (data: unknown[]) => void;
  setCurrentSplitIndex: (i: number) => void;
  addPaymentResult: (result: unknown) => void;
  setTableOrders: (data: unknown[]) => void;
  addLog: (log: ApiLog) => void;
  clearLogs: () => void;
  reset: () => void;
}

export interface CartItem {
  menu_item_uid: string;
  menu_item_name: string;
  price_uid: string;
  unit_price: number;
  quantity: number;
  currency: string;
  menu_item_category: string;
  menu_item_description: string;
  menu_item_image_url: string;
  menu_uid: string;
  menu_reference_id: string;
  special_instruction: string;
  condiment_groups: {
    condiment_group_uid: string;
    condiment_group_name: string;
    selected_options: {
      condiment_uid: string;
      condiment_name: string;
      quantity: number;
      price: number;
      selected_sub_modifiers: unknown[];
    }[];
  }[];
  combo_group_selections: unknown[];
}

const initialState = {
  baseUrl: 'https://dev-api.reservationz.app',
  outletSlug: 'bella-cuchina',
  tenantId: 'c1794f8b-80d9-4a45-a382-5e571d73b8b9',
  menuUid: '4570fb89-2d9f-40de-a5a7-074155b7df66',
  machineId: 'web-dashboard',
  imeiId: 'web-dashboard',
  deviceId: 'web-dashboard-' + (typeof crypto !== 'undefined' ? crypto.randomUUID?.() || 'default' : 'default'),
  restaurant: null,
  posConfig: null,
  employeeId: 'EMP001',
  waiter: null,
  floors: [],
  selectedTable: null,
  menus: [],
  selectedMenuUid: '',
  menuDetail: null,
  sessionKey: '',
  cartItems: [],
  orderNumber: '',
  orderData: null,
  idempotencySessionKey: '',
  splits: [],
  currentSplitIndex: 0,
  paymentResults: [],
  tableOrders: [],
  logs: [],
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setConfig: (key, value) => set({ [key]: value } as Partial<AppState>),
  setRestaurant: (data) => set({ restaurant: data }),
  setPosConfig: (data) => set({ posConfig: data }),
  setWaiter: (data) => set({ waiter: data }),
  setEmployeeId: (id) => set({ employeeId: id }),
  setFloors: (data) => set({ floors: data }),
  setSelectedTable: (data) => set({ selectedTable: data }),
  setMenus: (data) => set({ menus: data }),
  setSelectedMenuUid: (uid) => set({ selectedMenuUid: uid }),
  setMenuDetail: (data) => set({ menuDetail: data }),
  setSessionKey: (key) => set({ sessionKey: key }),
  addCartItem: (item) => set((s) => ({ cartItems: [...s.cartItems, item] })),
  removeCartItem: (index) => set((s) => ({ cartItems: s.cartItems.filter((_, i) => i !== index) })),
  updateCartItem: (index, item) => set((s) => ({
    cartItems: s.cartItems.map((c, i) => (i === index ? item : c)),
  })),
  clearCart: () => set({ cartItems: [] }),
  setOrderNumber: (num) => set({ orderNumber: num }),
  setOrderData: (data) => set({ orderData: data }),
  setIdempotencySessionKey: (key) => set({ idempotencySessionKey: key }),
  setSplits: (data) => set({ splits: data }),
  setCurrentSplitIndex: (i) => set({ currentSplitIndex: i }),
  addPaymentResult: (result) => set((s) => ({ paymentResults: [...s.paymentResults, result] })),
  setTableOrders: (data) => set({ tableOrders: data }),
  addLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 200) })),
  clearLogs: () => set({ logs: [] }),
  reset: () => set({ ...initialState, deviceId: 'web-dashboard-' + crypto.randomUUID() }),
}));
