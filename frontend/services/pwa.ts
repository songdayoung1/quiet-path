const SERVICE_WORKER_PATH = '/sw.js';
const SERVICE_WORKER_SCOPE = '/';

export const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true;
};

export const registerAppServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE });
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.warn('Quiet Path service worker registration failed.', error);
    return null;
  }
};
