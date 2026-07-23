import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock3,
  Info,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Pencil,
  RefreshCcw,
  Sun,
  User,
  X,
} from 'lucide-react';
import { AppState } from '../types';
import { authApi, isMockAccessToken } from '../api/authApi';
import { notificationApi, NotificationPreferenceResponse } from '../api/notificationApi';
import { disableWebPush, enableWebPush, hasWebPushSubscription } from '../services/webPush';
import { generateNickname } from './NicknameSetupView';
import { AppModal } from '../components/AppModal';

interface SettingsViewProps {
  state: AppState;
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void | Promise<void>;
}

type ThemeMode = 'system' | 'light' | 'dark';
type PermissionState = 'default' | 'granted' | 'denied';
type BusyKey =
  | 'likes'
  | 'comments'
  | 'reviewReminder'
  | 'time'
  | 'theme'
  | 'nickname'
  | 'permission'
  | 'logout';

interface LocalSettings {
  notifications: {
    likes: boolean;
    comments: boolean;
    reviewReminder: boolean;
    hour: number;
    minute: number;
  };
  permission: PermissionState;
  theme: ThemeMode;
}

interface ToastItem {
  id: number;
  type: 'ok' | 'error' | 'info';
  message: string;
}

const SETTINGS_KEY = 'qp.settings.v3';
const NICKNAME_KEY = 'qp.profile.nickname';
const THEME_CHANGE_EVENT = 'qp:theme-mode-changed';

const DEFAULT_SETTINGS: LocalSettings = {
  notifications: {
    likes: false,
    comments: false,
    reviewReminder: false,
    hour: 21,
    minute: 0,
  },
  permission: 'default',
  theme: 'system',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const detectNotificationPermission = (): PermissionState => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  const permission = Notification.permission;
  if (permission === 'granted' || permission === 'denied') return permission;
  return 'default';
};

const readLocalSettings = (): LocalSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS, permission: detectNotificationPermission() };
    }

    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      notifications: {
        likes: parsed.notifications?.likes ?? DEFAULT_SETTINGS.notifications.likes,
        comments: parsed.notifications?.comments ?? DEFAULT_SETTINGS.notifications.comments,
        reviewReminder:
          parsed.notifications?.reviewReminder ?? DEFAULT_SETTINGS.notifications.reviewReminder,
        hour: parsed.notifications?.hour ?? DEFAULT_SETTINGS.notifications.hour,
        minute: parsed.notifications?.minute ?? DEFAULT_SETTINGS.notifications.minute,
      },
      permission: detectNotificationPermission(),
      theme: parsed.theme ?? 'system',
    };
  } catch {
    return { ...DEFAULT_SETTINGS, permission: detectNotificationPermission() };
  }
};

const writeLocalSettings = (settings: LocalSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const notificationsFromResponse = (
  response: NotificationPreferenceResponse
): LocalSettings['notifications'] => {
  const [hour, minute] = response.reviewReminderTime.split(':').map(Number);
  return {
    likes: response.reactionEnabled,
    comments: response.commentEnabled,
    reviewReminder: response.reviewReminderEnabled,
    hour: Number.isFinite(hour) ? hour : DEFAULT_SETTINGS.notifications.hour,
    minute: Number.isFinite(minute) ? minute : DEFAULT_SETTINGS.notifications.minute,
  };
};

const hasEnabledNotification = (notifications: LocalSettings['notifications']) =>
  notifications.likes || notifications.comments || notifications.reviewReminder;

const toPreferenceRequest = (notifications: LocalSettings['notifications']) => ({
  reactionEnabled: notifications.likes,
  commentEnabled: notifications.comments,
  reviewReminderEnabled: notifications.reviewReminder,
  reviewReminderTime: `${String(notifications.hour).padStart(2, '0')}:${String(notifications.minute).padStart(2, '0')}`,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
});

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
};

const applyTheme = (mode: ThemeMode) => {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.qpTheme = resolved;
  document.documentElement.style.colorScheme = resolved;
};

const validateNickname = (nickname: string) => {
  const trimmed = nickname.trim();
  if (!trimmed) return '닉네임을 입력해주세요';
  if (trimmed.length < 2 || trimmed.length > 12) return '2~12자, 한글·영문·숫자 사용 가능';
  if (!/^[A-Za-z0-9가-힣]+$/.test(trimmed)) return '2~12자, 한글·영문·숫자 사용 가능';
  return '';
};

const SectionLabel: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 px-1 mb-2.5">
    <span style={{ color: 'var(--qp-accent)' }}>{icon}</span>
    <h2 className="text-[11px] font-bold tracking-[0.16em]" style={{ color: 'var(--qp-text-muted)' }}>
      {title}
    </h2>
  </div>
);

const Toggle: React.FC<{
  value: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ value, busy, disabled, onClick }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={onClick}
    disabled={busy || disabled}
    className="relative w-[42px] h-[24px] rounded-full"
    style={{
      background: value ? 'var(--qp-accent)' : 'var(--qp-toggle-off)',
      opacity: busy || disabled ? 0.5 : 1,
      transition: 'background-color 180ms ease',
      cursor: busy ? 'wait' : disabled ? 'not-allowed' : 'pointer',
    }}
  >
    <span
      className="absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white"
      style={{
        transform: value ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 180ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
      }}
    />
  </button>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ state, onClose, onLogin, onLogout }) => {
  const isLoggedIn = !!state.auth?.isLoggedIn;
  const token = state.auth?.token ?? null;

  const [settings, setSettings] = useState<LocalSettings>(readLocalSettings);
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICKNAME_KEY) || '고요한물결0421');
  const [busy, setBusy] = useState<Partial<Record<BusyKey, boolean>>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false);

  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);
  const profileRequestRef = useRef<ReturnType<typeof authApi.getMe> | null>(null);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const resolvedTheme = useMemo(() => resolveTheme(settings.theme), [settings.theme]);

  const syncPermissionFromBrowser = useCallback(async () => {
    const nextPermission = detectNotificationPermission();
    setSettings((prev) => {
      if (prev.permission === nextPermission) return prev;
      return { ...prev, permission: nextPermission };
    });
    setBrowserPushEnabled(await hasWebPushSubscription().catch(() => false));
  }, []);

  const themeVars: React.CSSProperties =
    resolvedTheme === 'dark'
      ? ({
          ['--qp-bg-grad-from' as string]: '#121826',
          ['--qp-bg-grad-to' as string]: '#132028',
          ['--qp-surface' as string]: 'rgba(30,41,59,0.72)',
          ['--qp-surface-solid' as string]: '#1E293B',
          ['--qp-input-bg' as string]: 'rgba(15,23,42,0.82)',
          ['--qp-input-soft-bg' as string]: 'rgba(15,23,42,0.7)',
          ['--qp-modal-surface' as string]: 'rgba(15,23,42,0.96)',
          ['--qp-modal-border' as string]: 'rgba(148,163,184,0.24)',
          ['--qp-neutral-btn-bg' as string]: 'rgba(30,41,59,0.92)',
          ['--qp-neutral-btn-text' as string]: '#E2E8F0',
          ['--qp-danger-btn-bg' as string]: 'rgba(127,29,29,0.3)',
          ['--qp-danger-btn-border' as string]: 'rgba(251,113,133,0.55)',
          ['--qp-text-strong' as string]: '#E2E8F0',
          ['--qp-text-muted' as string]: '#94A3B8',
          ['--qp-text-faint' as string]: '#64748B',
          ['--qp-border' as string]: 'rgba(148,163,184,0.18)',
          ['--qp-divider' as string]: 'rgba(148,163,184,0.08)',
          ['--qp-accent' as string]: '#8B5CF6',
          ['--qp-accent-soft' as string]: 'rgba(139,92,246,0.16)',
          ['--qp-accent-tint' as string]: 'rgba(139,92,246,0.12)',
          ['--qp-accent-text' as string]: '#C4B5FD',
          ['--qp-warn-soft' as string]: 'rgba(245,158,11,0.16)',
          ['--qp-warn-border' as string]: '#F59E0B',
          ['--qp-warn-accent' as string]: '#F59E0B',
          ['--qp-warn-text' as string]: '#FCD34D',
          ['--qp-danger-soft' as string]: 'rgba(244,63,94,0.14)',
          ['--qp-danger-border' as string]: '#FB7185',
          ['--qp-danger-text' as string]: '#FB7185',
          ['--qp-toggle-off' as string]: 'rgba(148,163,184,0.38)',
          ['--qp-overlay' as string]: 'rgba(15,23,42,0.9)',
        } as React.CSSProperties)
      : ({
          ['--qp-bg-grad-from' as string]: '#ECEFFE',
          ['--qp-bg-grad-to' as string]: '#E2EEEC',
          ['--qp-surface' as string]: 'rgba(255,255,255,0.70)',
          ['--qp-surface-solid' as string]: '#F8FAFC',
          ['--qp-input-bg' as string]: 'rgba(255,255,255,0.92)',
          ['--qp-input-soft-bg' as string]: 'rgba(255,255,255,0.82)',
          ['--qp-modal-surface' as string]: 'rgba(255,255,255,0.96)',
          ['--qp-modal-border' as string]: 'rgba(255,255,255,0.72)',
          ['--qp-neutral-btn-bg' as string]: '#F1F5F9',
          ['--qp-neutral-btn-text' as string]: '#334155',
          ['--qp-danger-btn-bg' as string]: '#FFF1F2',
          ['--qp-danger-btn-border' as string]: '#FB7185',
          ['--qp-text-strong' as string]: '#334155',
          ['--qp-text-muted' as string]: '#64748B',
          ['--qp-text-faint' as string]: '#94A3B8',
          ['--qp-border' as string]: 'rgba(255,255,255,0.72)',
          ['--qp-divider' as string]: 'rgba(148,163,184,0.12)',
          ['--qp-accent' as string]: '#8B5CF6',
          ['--qp-accent-soft' as string]: '#EDE9FE',
          ['--qp-accent-tint' as string]: '#F1EEF9',
          ['--qp-accent-text' as string]: '#7C3AED',
          ['--qp-warn-soft' as string]: '#FFF7E8',
          ['--qp-warn-border' as string]: '#F4C562',
          ['--qp-warn-accent' as string]: '#F59E0B',
          ['--qp-warn-text' as string]: '#B45309',
          ['--qp-danger-soft' as string]: '#FFE4E6',
          ['--qp-danger-border' as string]: '#FDA4AF',
          ['--qp-danger-text' as string]: '#E11D48',
          ['--qp-toggle-off' as string]: '#CBD5E1',
          ['--qp-overlay' as string]: 'rgba(241,245,249,0.95)',
        } as React.CSSProperties);

  const panelStyle: React.CSSProperties = {
    background: 'var(--qp-surface)',
    border: '1px solid var(--qp-border)',
    borderRadius: 22,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(20,22,40,0.035)',
  };

  const pushToast = (type: ToastItem['type'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2000);
  };

  useEffect(() => {
    writeLocalSettings(settings);
    applyTheme(settings.theme);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode: settings.theme } }));
  }, [settings]);

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [settings.theme]);

  useEffect(() => {
    void syncPermissionFromBrowser();

    const onFocus = () => void syncPermissionFromBrowser();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void syncPermissionFromBrowser();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncPermissionFromBrowser]);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !token) {
      profileRequestRef.current = null;
      return;
    }

    if (!profileRequestRef.current) {
      profileRequestRef.current = authApi.getMe(token, { retryOnUnauthorized: true });
    }
    const profileRequest = profileRequestRef.current;

    profileRequest
      .then((me) => {
        if (cancelled) return;
        setNickname(me.name);
        localStorage.setItem(NICKNAME_KEY, me.name);
      })
      .catch(() => {
        if (profileRequestRef.current === profileRequest) {
          profileRequestRef.current = null;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, token]);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !token || isMockAccessToken(token)) return;

    notificationApi.getPreferences(token)
      .then(async (preference) => {
        if (cancelled) return;
        const notifications = notificationsFromResponse(preference);
        setSettings((prev) => ({ ...prev, notifications }));
      })
      .catch(() => {
        if (!cancelled) pushToast('error', '알림 설정을 불러오지 못했어요');
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (!nicknameEditing) return;
    const timer = window.setTimeout(() => {
      nicknameInputRef.current?.focus();
      nicknameInputRef.current?.select();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [nicknameEditing]);

  const persist = async (key: BusyKey, next: LocalSettings, okMessage: string) => {
    if (busy[key]) return;
    setBusy((prev) => ({ ...prev, [key]: true }));
    setSettings(next);
    await sleep(240);
    setBusy((prev) => ({ ...prev, [key]: false }));
    pushToast('ok', okMessage);
  };

  const handleRequestPermission = async () => {
    if (!isLoggedIn) {
      pushToast('info', '로그인 화면으로 이동해요');
      onLogin();
      return;
    }
    if (busy.permission) return;

    setBusy((prev) => ({ ...prev, permission: true }));
    try {
      if (!('Notification' in window)) {
        setSettings((prev) => ({ ...prev, permission: 'denied' }));
        pushToast('error', '이 브라우저는 알림을 지원하지 않아요');
        return;
      }

      if (Notification.permission === 'denied') {
        setSettings((prev) => ({ ...prev, permission: 'denied' }));
        pushToast('info', '브라우저 설정에서 이 사이트 알림 허용 후 다시 시도해주세요');
        return;
      }

      const permission = isMockAccessToken(token ?? '')
        ? (await Notification.requestPermission()) as PermissionState
        : (await enableWebPush(token!)) && 'granted' as PermissionState;
      if (permission === 'granted') {
        const recommended = hasEnabledNotification(settings.notifications)
          ? settings.notifications
          : {
              ...settings.notifications,
              likes: true,
              comments: true,
              reviewReminder: true,
            };
        const saved = isMockAccessToken(token ?? '')
          ? recommended
          : notificationsFromResponse(
              await notificationApi.updatePreferences(token!, toPreferenceRequest(recommended))
            );
        setSettings((prev) => ({ ...prev, permission, notifications: saved }));
        setBrowserPushEnabled(true);
        pushToast('ok', '이 브라우저에서 알림을 받을게요');
      } else {
        setSettings((prev) => ({ ...prev, permission }));
        setBrowserPushEnabled(false);
        if (permission === 'denied') pushToast('info', '브라우저 설정에서 권한을 다시 켜주세요');
        else pushToast('info', '알림 권한이 허용되지 않았어요');
      }
    } catch (error) {
      setBrowserPushEnabled(false);
      pushToast('error', error instanceof Error ? error.message : '알림을 켜지 못했어요');
    } finally {
      setBusy((prev) => ({ ...prev, permission: false }));
    }
  };

  const persistNotificationSettings = async (
    key: 'likes' | 'comments' | 'reviewReminder' | 'time',
    notifications: LocalSettings['notifications'],
    okMessage: string
  ) => {
    if (!token || busy[key]) return;
    setBusy((prev) => ({ ...prev, [key]: true }));
    try {
      let saved = notifications;
      if (isMockAccessToken(token)) {
        await sleep(240);
      } else {
        const response = await notificationApi.updatePreferences(token, toPreferenceRequest(notifications));
        saved = notificationsFromResponse(response);
        if (
          hasEnabledNotification(saved) &&
          !browserPushEnabled &&
          Notification.permission === 'granted'
        ) {
          await enableWebPush(token);
          setBrowserPushEnabled(true);
        } else if (!hasEnabledNotification(saved) && browserPushEnabled) {
          await disableWebPush(token);
          setBrowserPushEnabled(false);
        }
      }
      setSettings((prev) => ({ ...prev, notifications: saved }));
      pushToast('ok', okMessage);
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : '알림 설정 저장에 실패했어요');
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleToggle = async (key: 'likes' | 'comments' | 'reviewReminder', label: string) => {
    if (!isLoggedIn) {
      onLogin();
      return;
    }
    const notifications = {
      ...settings.notifications,
      [key]: !settings.notifications[key],
    };
    await persistNotificationSettings(
      key,
      notifications,
      `${label} 알림이 ${notifications[key] ? '켜졌어요' : '꺼졌어요'}`
    );
  };

  const handleTimeChange = async (hour: number, minute: number) => {
    if (!isLoggedIn || busy.time) return;
    const notifications = { ...settings.notifications, hour, minute };
    await persistNotificationSettings(
      'time',
      notifications,
      `매일 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 알림으로 저장됐어요`
    );
  };

  const handleTheme = async (theme: ThemeMode) => {
    if (settings.theme === theme || busy.theme) return;
    await persist('theme', { ...settings, theme }, '테마가 저장되었어요');
  };

  const openNicknameEdit = () => {
    if (!isLoggedIn) {
      onLogin();
      return;
    }
    setNicknameDraft(nickname);
    setNicknameError('');
    setNicknameEditing(true);
  };

  const clearNicknameDraft = () => {
    setNicknameDraft('');
    if (nicknameError) setNicknameError('');
    nicknameInputRef.current?.focus();
  };

  const applyRecommendedNickname = () => {
    const next = generateNickname();
    setNicknameDraft(next);
    setNicknameError('');
  };

  const cancelNicknameEdit = () => {
    setNicknameDraft(nickname);
    setNicknameError('');
    setNicknameEditing(false);
  };

  const submitNicknameChange = async () => {
    if (!isLoggedIn || !token || busy.nickname) return;

    const value = nicknameDraft.trim();
    const validationMessage = validateNickname(value);
    if (validationMessage) {
      setNicknameError(validationMessage);
      return;
    }
    if (value === nickname) {
      setNicknameEditing(false);
      return;
    }

    setBusy((prev) => ({ ...prev, nickname: true }));
    try {
      const me = await authApi.updateNickname(token, value);
      setNickname(me.name);
      localStorage.setItem(NICKNAME_KEY, me.name);
      pushToast('ok', '닉네임이 변경되었어요');
      setNicknameEditing(false);
    } catch (error: any) {
      setNicknameError(error?.message || '닉네임 변경에 실패했어요');
    } finally {
      setBusy((prev) => ({ ...prev, nickname: false }));
    }
  };

  const confirmLogout = async () => {
    if (!isLoggedIn || busy.logout) return;
    setBusy((prev) => ({ ...prev, logout: true }));
    try {
      await onLogout();
      setLogoutModalOpen(false);
      pushToast('ok', '로그아웃되었어요');
    } finally {
      setBusy((prev) => ({ ...prev, logout: false }));
    }
  };

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const showPermissionCard = isLoggedIn && !browserPushEnabled;
  const showGuestNotice = !isLoggedIn;
  const hasNotificationTopBlock = showPermissionCard || showGuestNotice;

  return (
    <div
      className="relative min-h-[calc(100dvh-56px)] w-full px-6 pb-10 pt-5 animate-slide-up overflow-y-auto"
      style={{
        ...themeVars,
        background: 'linear-gradient(180deg, var(--qp-bg-grad-from) 0%, var(--qp-bg-grad-to) 100%)',
      }}
    >
      <header className="relative h-11 mb-8">
        <h1 className="text-center text-[16px] font-bold tracking-tight" style={{ color: 'var(--qp-text-strong)' }}>
          설정
        </h1>
        <button
          onClick={onClose}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full grid place-items-center"
          style={{ color: 'var(--qp-text-muted)' }}
          aria-label="설정 닫기"
        >
          <X size={21} />
        </button>
      </header>

      <section className="mb-6">
        <SectionLabel icon={<User size={13} />} title="계정" />
        <div style={panelStyle}>
          {isLoggedIn ? (
            <>
              {nicknameEditing ? (
                <div
                  className="px-4 py-3"
                  style={{
                    background: 'var(--qp-accent-tint)',
                    borderBottom: '1px solid var(--qp-divider)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[10px] font-bold tracking-[0.18em]" style={{ color: 'var(--qp-accent-text)' }}>
                      NICKNAME
                    </p>
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--qp-text-faint)' }}>
                      {nicknameDraft.trim().length}/12
                    </span>
                  </div>

                  <div
                    className="w-full min-h-[52px] rounded-[16px] px-3 py-2 flex items-center gap-2"
                    style={{
                      background: 'var(--qp-input-bg)',
                      border: `1.5px solid ${nicknameError ? 'var(--qp-danger-border)' : 'var(--qp-accent)'}`,
                      boxShadow: '0 0 0 2px rgba(139,92,246,0.05)',
                    }}
                  >
                    <input
                      ref={nicknameInputRef}
                      value={nicknameDraft}
                      onChange={(event) => {
                        setNicknameDraft(event.target.value);
                        if (nicknameError) setNicknameError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void submitNicknameChange();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelNicknameEdit();
                        }
                      }}
                      placeholder="닉네임을 입력해주세요"
                      className="flex-1 bg-transparent text-[15px] font-bold leading-tight focus:outline-none"
                      style={{ color: 'var(--qp-text-strong)' }}
                      disabled={!!busy.nickname}
                      maxLength={12}
                    />
                    <button
                      type="button"
                      onClick={clearNicknameDraft}
                      disabled={!nicknameDraft || !!busy.nickname}
                      className="w-8 h-8 rounded-full grid place-items-center shrink-0"
                      style={{
                        background: 'var(--qp-accent-soft)',
                        color: 'var(--qp-text-faint)',
                        opacity: !nicknameDraft || busy.nickname ? 0.5 : 1,
                      }}
                      aria-label="닉네임 입력 지우기"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="mt-2 px-1 flex items-center justify-between gap-3">
                    <p className="text-[10.5px] min-h-[16px]" style={{ color: nicknameError ? 'var(--qp-danger-text)' : 'var(--qp-text-muted)' }}>
                      {nicknameError || '2~12자, 한글·영문·숫자 사용 가능'}
                    </p>
                    <button
                      type="button"
                      onClick={applyRecommendedNickname}
                      disabled={!!busy.nickname}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                      style={{
                        background: 'var(--qp-input-soft-bg)',
                        color: 'var(--qp-accent-text)',
                        border: '1px solid var(--qp-border)',
                        opacity: busy.nickname ? 0.55 : 1,
                      }}
                    >
                      <RefreshCcw size={11} />
                      추천 조합
                    </button>
                  </div>

                  <div className="mt-3.5 flex gap-2">
                    <button
                      type="button"
                      onClick={cancelNicknameEdit}
                      disabled={!!busy.nickname}
                      className="flex-1 min-h-[40px] rounded-[14px] text-[12.5px] font-semibold"
                      style={{
                        background: 'var(--qp-input-bg)',
                        color: 'var(--qp-text-strong)',
                        border: '1px solid var(--qp-border)',
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitNicknameChange()}
                      disabled={!!busy.nickname}
                      className="flex-1 min-h-[40px] rounded-[14px] text-[12.5px] font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, #BFA7FA 0%, #A78BFA 100%)',
                        opacity: busy.nickname ? 0.7 : 1,
                      }}
                    >
                      {busy.nickname ? '저장 중…' : '저장'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-4 flex items-center gap-3.5" style={{ borderBottom: '1px solid var(--qp-divider)' }}>
                  <div
                    className="w-12 h-12 rounded-full grid place-items-center text-white text-[15px] font-bold shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, var(--qp-accent), #7C3AED)',
                      boxShadow: '0 4px 10px -2px rgba(139,92,246,0.35)',
                    }}
                  >
                    {nickname.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.18em] mb-0.5" style={{ color: 'var(--qp-accent-text)' }}>
                      NICKNAME
                    </p>
                    <p className="text-[15px] font-bold truncate leading-tight" style={{ color: 'var(--qp-text-strong)' }}>
                      {nickname}
                    </p>
                  </div>
                  <button
                    onClick={openNicknameEdit}
                    disabled={!!busy.nickname}
                    className="w-9 h-9 rounded-full grid place-items-center"
                    style={{
                      color: 'var(--qp-text-faint)',
                      background: 'transparent',
                      opacity: busy.nickname ? 0.6 : 1,
                    }}
                    aria-label="닉네임 편집"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}
              <button
                onClick={() => setLogoutModalOpen(true)}
                disabled={!!busy.logout}
                className="w-full px-4 py-3.5 text-left flex items-center justify-between"
                style={{ color: 'var(--qp-danger-text)' }}
              >
                <span className="text-[15px] font-semibold">로그아웃</span>
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full grid place-items-center shrink-0"
                  style={{ background: 'var(--qp-accent-soft)', color: 'var(--qp-accent-text)' }}
                >
                  <User size={15} />
                </div>
                <div>
                  <p className="text-[14px] font-bold mb-1" style={{ color: 'var(--qp-text-strong)' }}>
                    아직 로그인하지 않았어요
                  </p>
                  <p className="text-[12px] leading-[1.6]" style={{ color: 'var(--qp-text-muted)' }}>
                    게스트는 둘러보기만 가능해요.{' '}
                    <span className="font-semibold" style={{ color: 'var(--qp-text-strong)' }}>
                      기록 동기화·커뮤니티 상호작용
                    </span>
                    은 로그인 후 사용할 수 있어요.
                  </p>
                </div>
              </div>
              <button
                onClick={onLogin}
                className="w-full min-h-[52px] rounded-[14px] bg-[#FEE500] text-[#181600] text-[15px] font-bold tracking-tight flex items-center justify-center gap-2"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.77 1.86 5.2 4.67 6.59-.2.7-.73 2.55-.84 2.95-.13.49.18.49.38.36.16-.1 2.55-1.74 3.58-2.44.72.1 1.46.16 2.21.16 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
                </svg>
                카카오로 시작하기
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <SectionLabel icon={<Bell size={13} />} title="알림" />
        <div style={panelStyle}>
          {showPermissionCard && (
            <div
              className="mx-3 mt-3 mb-1 p-3 rounded-xl flex items-start gap-2.5"
              style={{
                background: 'var(--qp-warn-soft)',
                border: '1px solid var(--qp-warn-border)',
              }}
            >
              <AlertTriangle
                size={14}
                style={{ color: 'var(--qp-warn-accent)', marginTop: 2 }}
              />
              <div className="flex-1">
                <p
                  className="text-[12px] font-bold"
                  style={{ color: 'var(--qp-warn-text)' }}
                >
                  {settings.permission === 'denied'
                    ? '브라우저에서 알림이 차단되어 있어요'
                    : '이 브라우저의 알림이 꺼져 있어요'}
                </p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: 'var(--qp-warn-text)', opacity: 0.86 }}
                >
                  알림을 받을 때만 브라우저 권한을 요청할게요.
                </p>
              </div>
              <button
                onClick={handleRequestPermission}
                disabled={!!busy.permission}
                className="px-3 py-2 rounded-xl text-[11px] font-bold text-white"
                style={{
                  background: 'var(--qp-warn-accent)',
                  opacity: busy.permission ? 0.6 : 1,
                }}
              >
                알림 받기
              </button>
            </div>
          )}

          {showGuestNotice && (
            <p className="px-4 pt-3 pb-1 text-[11.5px]" style={{ color: 'var(--qp-text-muted)' }}>
              알림은 로그인 후 사용할 수 있어요. 토글을 누르면 로그인 화면으로 이동해요.
            </p>
          )}

          {[
            { key: 'likes', label: '커뮤니티 좋아요', hint: '내 글에 공감이 도착했을 때' },
            { key: 'comments', label: '커뮤니티 댓글', hint: '내 글에 댓글이 달렸을 때' },
            { key: 'reviewReminder', label: '회고 알림', hint: '회고하는 날, 설정한 시간에 알려드려요' },
          ].map((item, index) => (
            <div
              key={item.key}
              className="px-4 py-3.5 flex items-center gap-3"
              style={{ borderTop: index === 0 && !hasNotificationTopBlock ? 'none' : '1px solid var(--qp-divider)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold leading-tight" style={{ color: 'var(--qp-text-strong)' }}>
                  {item.label}
                </p>
                <p className="text-[11.5px] mt-1 leading-snug" style={{ color: 'var(--qp-text-muted)' }}>
                  {item.hint}
                </p>
              </div>
              {isLoggedIn ? (
                <Toggle
                  value={browserPushEnabled && settings.notifications[item.key as 'likes' | 'comments' | 'reviewReminder']}
                  busy={!!busy[item.key as BusyKey]}
                  disabled={!browserPushEnabled}
                  onClick={() => handleToggle(item.key as 'likes' | 'comments' | 'reviewReminder', item.label)}
                />
              ) : (
                <button
                  onClick={onLogin}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'var(--qp-accent)' }}
                >
                  로그인 필요
                </button>
              )}
            </div>
          ))}

          {browserPushEnabled && settings.notifications.reviewReminder && isLoggedIn && (
            <div
              className="px-4 py-3.5"
              style={{
                background: 'var(--qp-accent-tint)',
                borderTop: '1px solid var(--qp-divider)',
              }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <Clock3 size={14} style={{ color: 'var(--qp-accent)' }} />
                <p className="text-[12px] font-bold" style={{ color: 'var(--qp-text-strong)' }}>
                  알림 시간
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={settings.notifications.hour}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), settings.notifications.minute)}
                  disabled={!!busy.time}
                  className="flex-1 min-h-[40px] px-3 rounded-lg text-[14px] font-semibold"
                  style={{
                    background: 'var(--qp-surface-solid)',
                    color: 'var(--qp-text-strong)',
                    border: '1px solid var(--qp-divider)',
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}시
                    </option>
                  ))}
                </select>
                <select
                  value={settings.notifications.minute}
                  onChange={(e) => handleTimeChange(settings.notifications.hour, parseInt(e.target.value, 10))}
                  disabled={!!busy.time}
                  className="flex-1 min-h-[40px] px-3 rounded-lg text-[14px] font-semibold"
                  style={{
                    background: 'var(--qp-surface-solid)',
                    color: 'var(--qp-text-strong)',
                    border: '1px solid var(--qp-divider)',
                  }}
                >
                  {[0, 15, 30, 45].map((minute) => (
                    <option key={minute} value={minute}>
                      {String(minute).padStart(2, '0')}분
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--qp-text-muted)' }}>
                매일{' '}
                <b style={{ color: 'var(--qp-text-strong)' }}>
                  {String(settings.notifications.hour).padStart(2, '0')}:{String(settings.notifications.minute).padStart(2, '0')}
                </b>
                에 부드럽게 알려드릴게요. · {timezone}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <SectionLabel icon={<Palette size={13} />} title="테마" />
        <div style={panelStyle}>
          <div className="p-4">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--qp-accent-tint)' }}>
              {[
                { key: 'system', label: '시스템', icon: <Monitor size={14} /> },
                { key: 'light', label: '라이트', icon: <Sun size={14} /> },
                { key: 'dark', label: '다크', icon: <Moon size={14} /> },
              ].map((opt) => {
                const active = settings.theme === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleTheme(opt.key as ThemeMode)}
                    disabled={!!busy.theme}
                    className="flex-1 min-h-[36px] rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-1.5"
                    style={{
                      background: active ? 'var(--qp-surface-solid)' : 'transparent',
                      color: active ? 'var(--qp-accent-text)' : 'var(--qp-text-muted)',
                      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] mt-2.5 px-1" style={{ color: 'var(--qp-text-muted)' }}>
              기기 설정을 따라가요. 현재{' '}
              <b style={{ color: 'var(--qp-text-strong)' }}>{resolvedTheme === 'dark' ? '다크' : '라이트'} 모드</b>.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel icon={<Info size={13} />} title="기타" />
        <div style={panelStyle}>
          <div className="px-4 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--qp-divider)' }}>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--qp-text-strong)' }}>
              앱 버전
            </p>
            <span className="text-[12px] font-mono" style={{ color: 'var(--qp-text-faint)' }}>
              v0.4.2 · build 217
            </span>
          </div>
          {['이용약관', '문의하기', '회원탈퇴'].map((menu, index) => (
            <button
              key={menu}
              onClick={() => pushToast('info', '준비 중인 기능입니다')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left"
              style={{ borderBottom: index === 2 ? 'none' : '1px solid var(--qp-divider)' }}
            >
              <span className="text-[14px] font-semibold" style={{ color: 'var(--qp-text-muted)' }}>
                {menu}
              </span>
              <span className="text-[10px] font-bold tracking-[0.16em]" style={{ color: 'var(--qp-text-faint)' }}>
                SOON
              </span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-center text-[10px] tracking-[0.18em] pt-6" style={{ color: 'var(--qp-text-faint)' }}>
        QUIET PATH · © 2026
      </p>

      <AppModal
        open={logoutModalOpen}
        icon={<LogOut size={22} />}
        title="로그아웃할까요?"
        description={
          <>
            다시 로그인하면 모든 기록을 그대로 이어볼 수 있어요.
            <br />
            지금은 게스트 상태로 돌아갑니다.
          </>
        }
        confirmLabel={busy.logout ? '나가는 중…' : '로그아웃'}
        confirmVariant="danger"
        confirmDisabled={!!busy.logout}
        cancelDisabled={!!busy.logout}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={() => void confirmLogout()}
      />

      <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-4 py-2.5 rounded-full text-[12px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            style={{
              background:
                toast.type === 'error'
                  ? 'var(--qp-danger-soft)'
                  : toast.type === 'info'
                    ? 'var(--qp-overlay)'
                    : 'var(--qp-accent-soft)',
              color:
                toast.type === 'error'
                  ? 'var(--qp-danger-text)'
                  : toast.type === 'info'
                    ? 'var(--qp-text-strong)'
                    : 'var(--qp-accent-text)',
              border: `1px solid ${toast.type === 'error' ? 'var(--qp-danger-border)' : 'var(--qp-accent-tint)'}`,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};
