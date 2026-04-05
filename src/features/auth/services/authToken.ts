export const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed';

const notifyAuthTokenChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
  }
};

export const setAccessToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
    notifyAuthTokenChanged();
  }
};

export const clearAccessToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    notifyAuthTokenChanged();
  }
};

export const getAccessToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};
