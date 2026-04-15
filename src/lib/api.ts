import { useAppStore, type ApiLog } from '@/store/appStore';

function getHeaders(): Record<string, string> {
  const s = useAppStore.getState();
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'ngenius-app-to-app',
    'X-App-ID': '2',
    'X-Source-ID': 'pos_machine',
    'X-Tenant-ID': s.tenantId,
    'X-Machine-ID': s.machineId,
    'X-IMEI-ID': s.imeiId,
    'X-Device-ID': s.deviceId,
    'X-Outlet-Slug': s.outletSlug,
  };
}

export async function apiCall(
  method: string,
  url: string,
  body: unknown | null,
  phase: string,
  step: string
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const start = Date.now();
  const store = useAppStore.getState();

  const log: ApiLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    method,
    url,
    status: null,
    duration: 0,
    request: body,
    phase,
    step,
  };

  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        url: `${store.baseUrl}/${url.replace(/^\//, '')}`,
        headers: getHeaders(),
        body,
      }),
    });

    const data = await res.json();
    log.status = data.status;
    log.duration = Date.now() - start;
    log.response = data.body;
    store.addLog(log);

    return { ok: data.status >= 200 && data.status < 300, status: data.status, data: data.body };
  } catch (err) {
    log.status = 0;
    log.duration = Date.now() - start;
    log.error = err instanceof Error ? err.message : 'Unknown error';
    store.addLog(log);
    throw err;
  }
}
