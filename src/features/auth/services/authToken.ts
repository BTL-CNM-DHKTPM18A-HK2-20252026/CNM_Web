export const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed';
const ACCESS_TOKEN_STORAGE_KEY = 'accessToken';

// undefined = not loaded from sessionStorage yet
let inMemoryAccessToken: string | null | undefined;

const ensureTokenLoaded = () => {
  if (inMemoryAccessToken !== undefined) {
    return;
  }

  if (typeof window === 'undefined') {
    inMemoryAccessToken = null;
    return;
  }

  inMemoryAccessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

const notifyAuthTokenChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
  }
};

export const setAccessToken = (token: string) => {
  inMemoryAccessToken = token;

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }

  notifyAuthTokenChanged();
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;

  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  notifyAuthTokenChanged();
};

export const getAccessToken = () => {
  ensureTokenLoaded();
  return inMemoryAccessToken ?? null;
};
