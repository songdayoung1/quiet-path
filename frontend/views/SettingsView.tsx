import React, { useEffect, useMemo, useState } from 'react';
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
  Sun,
  User,
  X,
} from 'lucide-react';
import { AppState } from '../types';
import { authApi } from '../api/authApi';

interface SettingsViewProps {
  state: AppState;
  onClose: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

type ThemeMode = 'system' | 'light' | 'dark';
type PermissionState = 'default' | 'granted' | 'denied';
type BusyKey = 'likes' | 'comments' | 'pathEnd' | 'time' | 'theme' | 'nickname' | 'permission' | 'logout';

interface LocalSettings {
  notifications: {
    likes: boolean;
    comments: boolean;
    pathEnd: boolean;
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

const SETTINGS_KEY = 'qp.settings.v2';
const NICKNAME_KEY = 'qp.profile.nickname';

const DEFAULT_SETTINGS: LocalSettings = {
  notifications: {
    likes: true,
    comments: true,
    pathEnd: true,
    hour: 21,
    minute: 0,
  },
  permission: 'default',
  theme: 'system',
};

const readLocalSettings = (): LocalSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      notifications: {
        likes: parsed.notifications?.likes ?? DEFAULT_SETTINGS.notifications.likes,
        comments: parsed.notifications?.comments ?? DEFAULT_SETTINGS.notifications.comments,
        pathEnd: parsed.notifications?.pathEnd ?? DEFAULT_SETTINGS.notifications.pathEnd,
        hour: parsed.notifications?.hour ?? DEFAULT_SETTINGS.notifications.hour,
        minute: parsed.notifications?.minute ?? DEFAULT_SETTINGS.notifications.minute,
      },
      permission: parsed.permission ?? DEFAULT_SETTINGS.permission,
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const writeLocalSettings = (settings: LocalSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

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

const isNicknameFormatValid = (nickname: string) => /^[가-힣]{6}[0-9]{4}$/.test(nickname);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-2 px-1">
    <span style={{ color: 'var(--qp-accent)' }}>{icon}</span>
    <h2 className="text-[11px] font-bold tracking-[0.16em]" style={{ color: 'var(--qp-text-muted)' }}>
      {title}
    </h2>
  </div>
);

const Toggle: React.FC<{
  on: boolean;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
}> = ({ on, disabled, busy, onClick }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    disabled={disabled || busy}
    onClick={onClick}
    className="relative w-[42px] h-[24px] rounded-full"
    style={{
      background: on ? 'var(--qp-accent)' : 'var(--qp-border-line)',
      opacity: disabled || busy ? 0.45 : 1,
      transition: 'background-color 180ms ease',
      cursor: disabled || busy ? 'not-allowed' : 'pointer',
    }}
  >
    <span
      className="absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        transform: on ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 180ms ease',
      }}
    />
  </button>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ state, onClose, onLogin, onLogout }) => {
  const isLoggedIn = !!state.auth?.isLoggedIn;
  const token = state.auth?.token ?? null;

  const [settings, setSettings] = useState<LocalSettings>(readLocalSettings);
  const [nickname, setNickname] = useState<string>(() => localStorage.getItem(NICKNAME_KEY) || '고요한물결0421');
  const [busy, setBusy] = useState<Partial<Record<BusyKey, boolean>>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const resolvedTheme = useMemo(() => resolveTheme(settings.theme), [settings.theme]);

  const themeVars =
    resolvedTheme === 'dark'
      ? ({
          ['--qp-bg-grad-from' as string]: '#121826',
          ['--qp-bg-grad-to' as string]: '#132028',
          ['--qp-surface' as string]: 'rgba(30,41,59,0.68)',
          ['--qp-surface-solid' as string]: '#1E293B',
          ['--qp-text-strong' as string]: '#E2E8F0',
          ['--qp-text-muted' as string]: '#94A3B8',
          ['--qp-text-faint' as string]: '#64748B',
          ['--qp-border' as string]: 'rgba(148,163,184,0.24)',
          ['--qp-divider' as string]: 'rgba(148,163,184,0.16)',
          ['--qp-accent' as string]: '#8B5CF6',
          ['--qp-accent-soft' as string]: 'rgba(139,92,246,0.16)',
          ['--qp-accent-tint' as string]: 'rgba(139,92,246,0.12)',
          ['--qp-accent-text' as string]: '#C4B5FD',
          ['--qp-danger' as string]: '#FB7185',
          ['--qp-danger-soft' as string]: 'rgba(244,63,94,0.14)',
          ['--qp-danger-text' as string]: '#FDA4AF',
          ['--qp-warn-soft' as string]: 'rgba(245,158,11,0.16)',
          ['--qp-warn-border' as string]: '#F59E0B',
          ['--qp-warn-accent' as string]: '#F59E0B',
          ['--qp-warn-text' as string]: '#FCD34D',
          ['--qp-border-line' as string]: 'rgba(148,163,184,0.45)',
          ['--qp-overlay' as string]: 'rgba(15,23,42,0.92)',
        } as React.CSSProperties)
      : ({
          ['--qp-bg-grad-from' as string]: '#ECEFFE',
          ['--qp-bg-grad-to' as string]: '#E2EEEC',
          ['--qp-surface' as string]: 'rgba(255,255,255,0.72)',
          ['--qp-surface-solid' as string]: '#F8FAFC',
          ['--qp-text-strong' as string]: '#334155',
          ['--qp-text-muted' as string]: '#64748B',
          ['--qp-text-faint' as string]: '#94A3B8',
          ['--qp-border' as string]: 'rgba(255,255,255,0.75)',
          ['--qp-divider' as string]: 'rgba(203,213,225,0.7)',
          ['--qp-accent' as string]: '#8B5CF6',
          ['--qp-accent-soft' as string]: '#EDE9FE',
          ['--qp-accent-tint' as string]: '#F1EEF9',
          ['--qp-accent-text' as string]: '#7C3AED',
          ['--qp-danger' as string]: '#F43F5E',
          ['--qp-danger-soft' as string]: '#FFE4E6',
          ['--qp-danger-text' as string]: '#E11D48',
          ['--qp-warn-soft' as string]: '#FFF7E8',
          ['--qp-warn-border' as string]: '#F4C562',
          ['--qp-warn-accent' as string]: '#F59E0B',
          ['--qp-warn-text' as string]: '#B45309',
          ['--qp-border-line' as string]: '#CBD5E1',
          ['--qp-overlay' as string]: 'rgba(241,245,249,0.95)',
        } as React.CSSProperties);

  const panelStyle: React.CSSProperties = {
    background: 'var(--qp-surface)',
    border: '1px solid var(--qp-border)',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(20,22,40,0.04)',
    backdropFilter: 'blur(8px)',
  };

  const pushToast = (type: ToastItem['type'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2200);
  };

  useEffect(() => {
    writeLocalSettings(settings);
    applyTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [settings.theme]);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !token) return;
    authApi
      .getMe(token)
      .then((me) => {
        if (cancelled) return;
        setNickname(me.name);
        localStorage.setItem(NICKNAME_KEY, me.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, token]);

  const canUseNotification = isLoggedIn && settings.permission === 'granted';

  const persist = async (key: BusyKey, next: LocalSettings, okMessage: string) => {
    if (busy[key]) return;
    setBusy((prev) => ({ ...prev, [key]: true }));
    setSettings(next);
    await sleep(260);
    setBusy((prev) => ({ ...prev, [key]: false }));
    pushToast('ok', okMessage);
  };

  const handleRequestPermission = async () => {
    if (!isLoggedIn) {
      pushToast('info', '로그인하면 사용할 수 있어요');
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
      const permission = (await Notification.requestPermission()) as PermissionState;
      setSettings((prev) => ({ ...prev, permission }));
      if (permission === 'granted') pushToast('ok', '알림이 켜졌어요');
      else pushToast('info', '알림 권한이 허용되지 않았어요');
    } finally {
      setBusy((prev) => ({ ...prev, permission: false }));
    }
  };

  const handleToggleNotification = async (
    key: 'likes' | 'comments' | 'pathEnd',
    label: string
  ) => {
    if (!isLoggedIn) {
      pushToast('info', '로그인 화면으로 이동해요');
      onLogin();
      return;
    }
    if (settings.permission !== 'granted') {
      pushToast('info', 'OS 알림 권한을 먼저 허용해주세요');
      return;
    }

    const next = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    };

    await persist(
      key,
      next,
      `${label} 알림이 ${next.notifications[key] ? '켜졌어요' : '꺼졌어요'}`
    );
  };

  const handleChangeTime = async (hour: number, minute: number) => {
    if (!canUseNotification) return;
    const next = {
      ...settings,
      notifications: {
        ...settings.notifications,
        hour,
        minute,
      },
    };
    await persist(
      'time',
      next,
      `매일 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 알림으로 저장됐어요`
    );
  };

  const handleTheme = async (nextTheme: ThemeMode) => {
    if (busy.theme || settings.theme === nextTheme) return;
    const next = { ...settings, theme: nextTheme };
    await persist('theme', next, '테마가 저장되었어요');
  };

  const handleChangeNickname = async () => {
    if (!isLoggedIn || !token) {
      pushToast('info', '로그인 후 변경할 수 있어요');
      onLogin();
      return;
    }

    const next = window.prompt('새 닉네임 (한글 6글자 + 숫자 4자리)', nickname);
    if (!next) return;
    const value = next.trim();
    if (value === nickname) return;
    if (!isNicknameFormatValid(value)) {
      pushToast('error', '한글 6글자 + 숫자 4자리 형식이어야 해요');
      return;
    }

    setBusy((prev) => ({ ...prev, nickname: true }));
    try {
      const me = await authApi.updateNickname(token, value);
      setNickname(me.name);
      localStorage.setItem(NICKNAME_KEY, me.name);
      pushToast('ok', '닉네임이 변경되었어요');
    } catch (error: any) {
      pushToast('error', error?.message || '닉네임 변경에 실패했어요');
    } finally {
      setBusy((prev) => ({ ...prev, nickname: false }));
    }
  };

  const handleLogout = async () => {
    if (!isLoggedIn) return;
    if (!window.confirm('로그아웃하시겠어요? 게스트 모드로 전환됩니다.')) return;
    setBusy((prev) => ({ ...prev, logout: true }));
    onLogout();
    setBusy((prev) => ({ ...prev, logout: false }));
    pushToast('ok', '로그아웃되었어요');
  };

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div
      className="relative min-h-[calc(100dvh-56px)] w-full max-w-[430px] mx-auto px-5 pb-10 pt-4 animate-fade-in"
      style={{
        ...themeVars,
        background: 'linear-gradient(180deg, var(--qp-bg-grad-from) 0%, var(--qp-bg-grad-to) 100%)',
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center"
        style={{ color: 'var(--qp-text-muted)' }}
        aria-label="설정 닫기"
      >
        <X size={18} />
      </button>

      <section className="mb-5">
        <SectionTitle icon={<User size={13} />} title="계정" />
        <div style={panelStyle}>
          {isLoggedIn ? (
            <>
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
                  <p className="text-[10px] font-bold tracking-[0.16em] mb-0.5" style={{ color: 'var(--qp-accent-text)' }}>
                    NICKNAME
                  </p>
                  <p className="text-[15px] font-bold truncate leading-tight" style={{ color: 'var(--qp-text-strong)' }}>
                    {nickname}
                  </p>
                </div>
                <button
                  onClick={handleChangeNickname}
                  disabled={!!busy.nickname}
                  className="px-3 py-2 rounded-lg text-[12px] font-bold flex items-center gap-1.5"
                  style={{
                    background: 'var(--qp-accent-soft)',
                    color: 'var(--qp-accent-text)',
                    border: '1px solid var(--qp-accent-tint)',
                    opacity: busy.nickname ? 0.6 : 1,
                  }}
                >
                  <Pencil size={12} />
                  변경
                </button>
              </div>
              <button
                onClick={handleLogout}
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
                    게스트는 둘러보기만 가능해요. <span className="font-semibold" style={{ color: 'var(--qp-text-strong)' }}>기록 동기화·커뮤니티 상호작용</span>
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

      <section className="mb-5">
        <SectionTitle icon={<Bell size={13} />} title="알림" />
        <div style={panelStyle}>
          {isLoggedIn && settings.permission !== 'granted' && (
            <div
              className="mx-3 mt-3 mb-1 p-3 rounded-xl flex items-start gap-2.5"
              style={{
                background: 'var(--qp-warn-soft)',
                border: '1px solid var(--qp-warn-border)',
              }}
            >
              <AlertTriangle size={14} style={{ color: 'var(--qp-warn-accent)', marginTop: 2 }} />
              <div className="flex-1">
                <p className="text-[12px] font-bold" style={{ color: 'var(--qp-warn-text)' }}>
                  알림 권한이 꺼져 있어요
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--qp-warn-text)', opacity: 0.85 }}>
                  설정한 알림을 받으려면 권한을 허용해주세요.
                </p>
              </div>
              <button
                onClick={handleRequestPermission}
                disabled={!!busy.permission}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-bold text-white"
                style={{ background: 'var(--qp-warn-accent)', opacity: busy.permission ? 0.6 : 1 }}
              >
                허용
              </button>
            </div>
          )}

          {!isLoggedIn && (
            <p className="px-4 pt-3 pb-1 text-[11.5px]" style={{ color: 'var(--qp-text-muted)' }}>
              알림은 로그인 후 사용할 수 있어요. 토글을 누르면 로그인 화면으로 이동해요.
            </p>
          )}

          {[
            { key: 'likes', label: '커뮤니티 좋아요', hint: '내 글에 공감이 도착했을 때' },
            { key: 'comments', label: '커뮤니티 댓글', hint: '내 글에 댓글이 달렸을 때' },
            { key: 'pathEnd', label: '방향 종료 알림', hint: '설정한 시간에 오늘의 방향을 마무리해요' },
          ].map((item, index) => (
            <div
              key={item.key}
              className="px-4 py-3.5 flex items-center gap-3"
              style={{
                borderTop: '1px solid var(--qp-divider)',
                borderBottom:
                  item.key === 'pathEnd' && settings.notifications.pathEnd && canUseNotification
                    ? '1px solid var(--qp-divider)'
                    : 'none',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold leading-tight" style={{ color: 'var(--qp-text-strong)' }}>
                  {item.label}
                </p>
                <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--qp-text-muted)' }}>
                  {item.hint}
                </p>
              </div>
              {isLoggedIn ? (
                <Toggle
                  on={settings.notifications[item.key as 'likes' | 'comments' | 'pathEnd']}
                  onClick={() =>
                    handleToggleNotification(
                      item.key as 'likes' | 'comments' | 'pathEnd',
                      item.label
                    )
                  }
                  disabled={settings.permission !== 'granted'}
                  busy={busy[item.key as BusyKey]}
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

          {settings.notifications.pathEnd && canUseNotification && (
            <div
              className="px-4 py-3.5"
              style={{
                background: 'var(--qp-accent-tint)',
              }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <Clock3 size={14} style={{ color: 'var(--qp-accent)' }} />
                <p className="text-[14px] font-bold" style={{ color: 'var(--qp-text-strong)' }}>
                  알림 시간
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={settings.notifications.hour}
                  onChange={(e) => handleChangeTime(parseInt(e.target.value, 10), settings.notifications.minute)}
                  disabled={!!busy.time}
                  className="flex-1 min-h-[40px] px-3 rounded-lg text-[14px] font-semibold"
                  style={{
                    background: 'var(--qp-surface-solid)',
                    color: 'var(--qp-text-strong)',
                    border: '1px solid var(--qp-border-line)',
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
                  onChange={(e) => handleChangeTime(settings.notifications.hour, parseInt(e.target.value, 10))}
                  disabled={!!busy.time}
                  className="flex-1 min-h-[40px] px-3 rounded-lg text-[14px] font-semibold"
                  style={{
                    background: 'var(--qp-surface-solid)',
                    color: 'var(--qp-text-strong)',
                    border: '1px solid var(--qp-border-line)',
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
                매일 <b style={{ color: 'var(--qp-text-strong)' }}>{String(settings.notifications.hour).padStart(2, '0')}:{String(settings.notifications.minute).padStart(2, '0')}</b>에 부드럽게 알려드릴게요. · {timezone}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-5">
        <SectionTitle icon={<Palette size={13} />} title="테마" />
        <div style={panelStyle}>
          <div className="p-4">
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: 'var(--qp-accent-tint)' }}
            >
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
              기기 설정을 따라가요. 현재 <b style={{ color: 'var(--qp-text-strong)' }}>{resolvedTheme === 'dark' ? '다크' : '라이트'} 모드</b>.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-2">
        <SectionTitle icon={<Info size={13} />} title="기타" />
        <div style={panelStyle}>
          <div className="px-4 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--qp-divider)' }}>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--qp-text-strong)' }}>
              앱 버전
            </p>
            <span className="text-[12px] font-mono" style={{ color: 'var(--qp-text-faint)' }}>
              v0.4.2 · build 217
            </span>
          </div>
          {['이용약관', '문의하기', '회원탈퇴'].map((menu, idx) => (
            <button
              key={menu}
              onClick={() => pushToast('info', '준비 중인 기능입니다')}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left"
              style={{ borderBottom: idx === 2 ? 'none' : '1px solid var(--qp-divider)' }}
            >
              <span className="text-[15px] font-semibold" style={{ color: 'var(--qp-text-muted)' }}>
                {menu}
              </span>
              <span className="text-[10px] font-bold tracking-[0.16em]" style={{ color: 'var(--qp-text-faint)' }}>
                SOON
              </span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-center text-[10px] tracking-[0.18em] pt-5" style={{ color: 'var(--qp-text-faint)' }}>
        QUIET PATH · © 2026
      </p>

      <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-4 py-2.5 rounded-full text-[12px] font-bold shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            style={{
              background:
                toast.type === 'ok'
                  ? 'var(--qp-accent-soft)'
                  : toast.type === 'error'
                    ? 'var(--qp-danger-soft)'
                    : 'var(--qp-overlay)',
              color:
                toast.type === 'ok'
                  ? 'var(--qp-accent-text)'
                  : toast.type === 'error'
                    ? 'var(--qp-danger-text)'
                    : 'var(--qp-text-strong)',
              border: `1px solid ${
                toast.type === 'ok'
                  ? 'var(--qp-accent-tint)'
                  : toast.type === 'error'
                    ? 'var(--qp-danger)'
                    : 'var(--qp-border-line)'
              }`,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};
