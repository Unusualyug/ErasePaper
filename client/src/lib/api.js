import axios from 'axios';

const authExpiredListeners = new Set();

export function subscribeAuthExpired(listener) {
  authExpiredListeners.add(listener);
  return () => authExpiredListeners.delete(listener);
}

let activeRequests = 0;
let activityStopTimer;
function emitApiActivity(active) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erasepaper:api-activity', { detail: { active } }));
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 25000,
  withCredentials: true,
});
function finishApiActivity() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests > 0) {
    emitApiActivity(activeRequests);
    return;
  }
  clearTimeout(activityStopTimer);
  activityStopTimer = setTimeout(() => {
    activityStopTimer = undefined;
    emitApiActivity(0);
  }, 100);
}

api.interceptors.request.use((config) => {
  clearTimeout(activityStopTimer);
  activityStopTimer = undefined;
  activeRequests += 1;
  emitApiActivity(activeRequests);
  return config;
});

api.interceptors.response.use(
  (response) => {
    finishApiActivity();
    return response;
  },
  (error) => {
    finishApiActivity();
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !/^\/?auth\/(login|register|demo\/quick)/.test(url)) {
      for (const listener of authExpiredListeners) listener(error);
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (error) =>
  error.response?.data?.error ||
  (error.code === 'ECONNABORTED'
    ? 'The request took too long. Please try again.'
    : 'Unable to connect. Please check your connection and try again.');

export async function downloadAttachment(requestId, attachment) {
  const response = await api.get(`/requests/${requestId}/attachments/${attachment.id}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default api;
