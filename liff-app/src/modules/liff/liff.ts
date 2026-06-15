import liff from '@line/liff';

export type LiffState = 'idle' | 'loading' | 'ready' | 'error';

export async function initLiff(liffId: string): Promise<void> {
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
  }
}

export function getIdToken(): string | null {
  return liff.getIDToken();
}

export function getProfile() {
  return liff.getProfile();
}

export function closeWindow() {
  liff.closeWindow();
}

export function isInLiff(): boolean {
  return liff.isInClient();
}

export async function shareCard(cardTitle: string, cardUrl: string) {
  if (!liff.isApiAvailable('shareTargetPicker')) return;
  await liff.shareTargetPicker([{
    type: 'text',
    text: `📋 ${cardTitle}\n${cardUrl}`,
  }]);
}
