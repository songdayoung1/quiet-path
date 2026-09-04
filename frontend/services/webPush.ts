import { notificationApi, WebPushSubscriptionPayload } from '../api/notificationApi';
import { registerAppServiceWorker } from './pwa';

export const isWebPushSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

export const hasWebPushSubscription = async () => {
  if (!isWebPushSupported() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return false;
  return Boolean(await registration.pushManager.getSubscription());
};

const decodeApplicationServerKey = (value: string) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const decoded = window.atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
};

const usesApplicationServerKey = (
  subscription: PushSubscription,
  expectedKey: Uint8Array
) => {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey) return false;
  const currentBytes = new Uint8Array(currentKey);
  return currentBytes.length === expectedKey.length &&
    currentBytes.every((value, index) => value === expectedKey[index]);
};

const toPayload = (subscription: PushSubscription): WebPushSubscriptionPayload => {
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;
  if (!serialized.endpoint || !p256dh || !auth) {
    throw new Error('브라우저 푸시 구독 키를 확인하지 못했습니다.');
  }
  return { endpoint: serialized.endpoint, keys: { p256dh, auth } };
};

const getRegistration = async () => {
  const registration = await registerAppServiceWorker();
  if (!registration) {
    throw new Error('이 브라우저는 서비스 워커를 지원하지 않습니다.');
  }
  return registration;
};

export const enableWebPush = async (token: string) => {
  if (!isWebPushSupported()) {
    throw new Error('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('브라우저 알림 권한이 필요합니다.');
  }

  const config = await notificationApi.getWebPushConfig(token);
  if (!config.enabled || !config.publicKey) {
    throw new Error('웹 푸시 서버 설정이 준비되지 않았습니다.');
  }

  const applicationServerKey = decodeApplicationServerKey(config.publicKey);
  const registration = await getRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !usesApplicationServerKey(subscription, applicationServerKey)) {
    await notificationApi.unsubscribe(token, subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  await notificationApi.register(token, toPayload(subscription));
  return subscription;
};

export const disableWebPush = async (token: string) => {
  if (!isWebPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await notificationApi.unsubscribe(token, subscription.endpoint);
  } finally {
    await subscription.unsubscribe();
  }
};

export const clearLocalWebPushSubscription = async () => {
  if (!isWebPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
};
