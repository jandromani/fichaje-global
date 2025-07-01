export interface SyncPayload {
  records: unknown[];
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      attempt += 1;
      if (attempt >= retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('unreachable');
}

class SyncBridge {
  private baseUrl = '/api';

  async syncRecords(payload: SyncPayload): Promise<{ conflict?: boolean }> {
    const res = await fetchWithRetry(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async sendLogs(logs: unknown[]): Promise<void> {
    await fetchWithRetry(`${this.baseUrl}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs })
    });
  }

  async sendConflictAlert(data: unknown): Promise<void> {
    await fetchWithRetry(`${this.baseUrl}/conflicts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}

export const syncBridge = new SyncBridge();
