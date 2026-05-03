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

/**
 * Đánh dấu tab này đã đăng nhập thành công (không bị copy sang tab mới).
 * window.name tồn tại qua F5 reload nhưng KHÔNG bị copy khi Ctrl+Click/mở tab mới.
 */
const TAB_AUTH_MARKER = 'fruvia-session-active';

export const markTabAuthenticated = () => {
  if (typeof window !== 'undefined') {
    window.name = TAB_AUTH_MARKER;
  }
};

export const isTabAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.name === TAB_AUTH_MARKER;
};

export const setAccessToken = (token: string) => {
  inMemoryAccessToken = token;

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    // Đánh dấu tab này chủ động đăng nhập (không phải inherit từ tab khác)
    window.name = TAB_AUTH_MARKER;
  }

  notifyAuthTokenChanged();
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;

  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    // Xóa marker khi logout để tab này không còn được coi là authenticated
    window.name = '';
  }

  notifyAuthTokenChanged();
};

export const getAccessToken = () => {
  ensureTokenLoaded();
  return inMemoryAccessToken ?? null;
};
