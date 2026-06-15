import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('app_auth');
  if (raw) {
    const auth = JSON.parse(raw) as { accessToken: string };
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const raw = localStorage.getItem('app_auth');
      if (raw) {
        const auth = JSON.parse(raw) as { refreshToken: string };
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
            refreshToken: auth.refreshToken,
          });
          const newToken = res.data.accessToken as string;
          const updated = { ...JSON.parse(raw), accessToken: newToken };
          localStorage.setItem('app_auth', JSON.stringify(updated));
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        } catch {
          localStorage.removeItem('app_auth');
          window.location.href = '/splash';
        }
      }
    }
    return Promise.reject(error);
  },
);
