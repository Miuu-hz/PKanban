import { fetch } from 'undici';

interface LineProfile {
  sub: string;
  name: string;
  picture?: string;
  email?: string;
}

export async function verifyLineIdToken(idToken: string): Promise<LineProfile> {
  const params = new URLSearchParams({
    id_token: idToken,
    client_id: process.env.LINE_CHANNEL_ID!,
  });

  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE token verify failed: ${res.status} — ${text}`);
  }

  const payload = (await res.json()) as LineProfile & {
    error?: string;
    error_description?: string;
  };

  if (payload.error) {
    throw new Error(`LINE token invalid: ${payload.error_description ?? payload.error}`);
  }

  return { sub: payload.sub, name: payload.name, picture: payload.picture, email: payload.email };
}
