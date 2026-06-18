import fp from 'fastify-plugin';
import { fetch } from 'undici';
import type { FastifyInstance } from 'fastify';

interface PlankaClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  delete(path: string): Promise<void>;
  ensureUser(lineUserId: string, name: string, email?: string): Promise<{ id: string; email: string }>;
}

declare module 'fastify' {
  interface FastifyInstance {
    planka: PlankaClient;
  }
}

export const plankaPlugin = fp(async (app: FastifyInstance) => {
  const baseUrl = process.env.PLANKA_BASE_URL!;
  let token = '';
  let tokenExpiry = 0;

  async function setToken(data: { item: string }) {
    token = data.item;
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h (Planka token lasts 1 day)
  }

  async function acceptTerms(): Promise<void> {
    // Try common Planka endpoints for accepting terms. The exact endpoint
    // varies by version, so we attempt the most likely ones.
    const endpoints = [
      `${baseUrl}/api/users/accept-terms`,
      `${baseUrl}/api/access-tokens/accept-terms`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailOrUsername: process.env.PLANKA_ADMIN_EMAIL,
            password: process.env.PLANKA_ADMIN_PASSWORD,
          }),
        });
        if (res.ok || res.status === 204) {
          app.log.info(`Planka terms accepted via ${url}`);
          return;
        }
      } catch (err) {
        app.log.debug({ err, url }, 'Terms accept attempt failed');
      }
    }

    throw new Error(
      'Planka requires accepting Terms of Service, but automatic acceptance failed. ' +
        'Please log in to the Planka web UI once and accept the terms manually.',
    );
  }

  async function login(attempt = 1): Promise<void> {
    const res = await fetch(`${baseUrl}/api/access-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: process.env.PLANKA_ADMIN_EMAIL,
        password: process.env.PLANKA_ADMIN_PASSWORD,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { item: string };
      await setToken(data);
      return;
    }

    const status = res.status;
    const body = await res.text().catch(() => '');

    // Some Planka versions require accepting the End User Terms before login.
    if (
      attempt === 1 &&
      (status === 400 || status === 401 || status === 403) &&
      /terms|accept|eula/i.test(body)
    ) {
      app.log.info('Planka login blocked by terms; auto-accepting...');
      await acceptTerms();
      return login(attempt + 1);
    }

    throw new Error(`Planka login failed: ${status} ${body}`);
  }

  async function headers() {
    if (!token || Date.now() > tokenExpiry) await login();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  const client: PlankaClient = {
    async get<T>(path: string) {
      const res = await fetch(`${baseUrl}/api${path}`, { headers: await headers() });
      if (res.status === 401) { token = ''; return client.get<T>(path); }
      if (!res.ok) throw new Error(`Planka GET ${path} → ${res.status}`);
      return (await res.json()) as T;
    },
    async post<T>(path: string, body: unknown) {
      const res = await fetch(`${baseUrl}/api${path}`, {
        method: 'POST', headers: await headers(), body: JSON.stringify(body),
      });
      if (res.status === 401) { token = ''; return client.post<T>(path, body); }
      if (!res.ok) throw new Error(`Planka POST ${path} → ${res.status}`);
      return (await res.json()) as T;
    },
    async patch<T>(path: string, body: unknown) {
      const res = await fetch(`${baseUrl}/api${path}`, {
        method: 'PATCH', headers: await headers(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Planka PATCH ${path} → ${res.status}`);
      return (await res.json()) as T;
    },
    async delete(path: string) {
      const res = await fetch(`${baseUrl}/api${path}`, {
        method: 'DELETE', headers: await headers(),
      });
      if (!res.ok) throw new Error(`Planka DELETE ${path} → ${res.status}`);
    },

    async ensureUser(lineUserId: string, name: string, email?: string) {
      const syntheticEmail = email ?? `line_${lineUserId}@kanban.local`;
      // Search existing users
      const users = await client.get<{ items: Array<{ id: string; email: string }> }>('/users');
      const existing = users.items.find((u) => u.email === syntheticEmail);
      if (existing) return existing;

      // Create new Planka user
      const created = await client.post<{ item: { id: string; email: string } }>('/users', {
        email: syntheticEmail,
        password: `line_${lineUserId}_${Date.now()}`,
        name,
        username: `line_${lineUserId}`,
      });
      return created.item;
    },
  };

  await login();
  app.decorate('planka', client);
});
