import React, { useEffect, useMemo, useState } from 'react';
import { AppState, ViewState, Record, Direction } from './types';
import { loadState, saveState, createDirectionId } from './storage';
import { HomeView } from './views/HomeView';
import { RecordsView } from './views/RecordsView';
import { DirectionView } from './views/DirectionView';
import { DailyRecordEditorView } from './views/DailyRecordEditorView';
import { OnboardingView } from './views/OnboardingView';
import { CommunityView } from './views/CommunityView';
import { PastDirectionsView } from './views/PastDirectionsView';
import { SettingsView } from './views/SettingsView';
import { OAuthCallbackView } from './views/OAuthCallbackView';
import { AccountConnectView } from './views/AccountConnectView';
import { NicknameSetupView } from './views/NicknameSetupView';
import { authApi } from './api/authApi';
import { pathApi, PathActiveResponse, PathCreateResponse } from './api/pathApi';
import { recordApi, RecordResponse } from './api/recordApi';
import { Settings, Compass, AlertCircle } from 'lucide-react';
import { AppModal } from './components/AppModal';
import { CATEGORIES } from './constants';

const OAUTH_PENDING_CODE_KEY = 'qp.oauth.pending.code';
const OAUTH_PENDING_ERROR_KEY = 'qp.oauth.pending.error';
const SETTINGS_STORAGE_KEY = 'qp.settings.v2';
const THEME_CHANGE_EVENT = 'qp:theme-mode-changed';

type ThemeMode = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

const readThemeMode = (): ThemeMode => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return 'system';
    const parsed = JSON.parse(raw) as { theme?: ThemeMode };
    if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
      return parsed.theme;
    }
    return 'system';
  } catch {
    return 'system';
  }
};

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
};

const applyDocumentTheme = (theme: ResolvedTheme) => {
  document.documentElement.dataset.qpTheme = theme;
  document.documentElement.style.colorScheme = theme;
};

/* ── Custom Nav Icons ───────────────────────────────────────────────────── */
const NavIcon: React.FC<{ view: ViewState | 'INITIALIZING'; active: boolean }> = ({ view, active }) => {
  const stroke = active ? '#FFFFFF' : '#94A3B8';
  const sp = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: '2' };

  if (view === 'NOW') return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1H4a1 1 0 01-1-1V10z" stroke={stroke} {...sp} />
        <path d="M9 21V12h6v9" stroke={stroke} {...sp} />
    </svg>
  );

  if (view === 'RECORDS') return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={stroke} {...sp} />
        <path d="M14 2v6h6" stroke={stroke} {...sp} />
        <path d="M16 13H8M16 17H8M10 9H8" stroke={stroke} {...sp} />
    </svg>
  );

  if (view === 'COMMUNITY') return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={stroke} {...sp} />
        <circle cx="9" cy="7" r="4" stroke={stroke} {...sp} />
        <path d="M23 21v-2a4 4 0 00-3-3.87" stroke={stroke} {...sp} />
        <path d="M16 3.13a4 4 0 010 7.75" stroke={stroke} {...sp} />
    </svg>
  );

  if (view === 'DIRECTION') return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <circle cx="12" cy="12" r="10" stroke={stroke} {...sp} />
        <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke={stroke} {...sp} />
    </svg>
  );

  return null;
};

const buildFlowBackground = (theme: ResolvedTheme): React.CSSProperties => {
  if (theme === 'dark') {
    return {
      backgroundColor: '#0F172A',
      backgroundImage:
        'radial-gradient(circle at -30% -25%, rgba(51,65,85,0.62) 0%, rgba(51,65,85,0) 64%), radial-gradient(circle at 130% 120%, rgba(30,41,59,0.56) 0%, rgba(30,41,59,0) 64%), linear-gradient(180deg, #111827 0%, #0B1220 100%)',
    };
  }

  return {
    backgroundColor: '#F8FAFC',
    backgroundImage:
      'radial-gradient(circle at -30% -25%, rgba(194,209,255,0.55) 0%, rgba(194,209,255,0) 62%), radial-gradient(circle at 130% 120%, rgba(178,223,219,0.55) 0%, rgba(178,223,219,0) 62%), linear-gradient(180deg, #ECEFFE 0%, #E2EEEC 100%)',
  };
};

const toLocalDateString = (timestamp?: number) => {
  const date = timestamp ? new Date(timestamp) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDateString = (value?: string) => {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`).getTime();
};

const buildDirectionFromActivePath = (
  path: PathActiveResponse,
  fallback?: Direction | null
): Direction | null => {
  if (!path.pathId) return null;
  const category = CATEGORIES.find((item) => item.id === path.categoryCode);
  return {
    id: String(path.pathId),
    question: path.directionText || fallback?.question || '이 방향으로 나는 어떻게 걸어가고 있을까?',
    description: path.directionName || fallback?.description || '지금의 방향',
    categoryId: path.categoryCode || fallback?.categoryId,
    categoryLabel: category?.label || fallback?.categoryLabel,
    createdAt: parseLocalDateString(path.createdAt) ?? fallback?.createdAt ?? Date.now(),
    reviewAt: parseLocalDateString(path.reviewAt) ?? fallback?.reviewAt,
    isActive: path.status ? path.status === 'ACTIVE' : true,
  };
};

const buildDirectionFromCreatedPath = (
  path: PathCreateResponse,
  fallback: Direction
): Direction => ({
  ...fallback,
  id: String(path.pathId),
  categoryId: path.categoryCode || fallback.categoryId,
  categoryLabel: CATEGORIES.find((item) => item.id === path.categoryCode)?.label || fallback.categoryLabel,
  createdAt: parseLocalDateString(path.createdAt) ?? fallback.createdAt,
  reviewAt: parseLocalDateString(path.reviewAt) ?? fallback.reviewAt,
  isActive: path.status ? path.status === 'ACTIVE' : true,
});

const buildRecordFromResponse = (
  record: RecordResponse,
  fallbackDirection?: Direction | null
): Record => {
  const createdAt = record.createdAt || `${record.recordDate}T00:00:00`;
  return {
    id: String(record.id),
    date: createdAt,
    timestamp: new Date(createdAt).getTime(),
    directionQuestion:
      record.directionText ||
      fallbackDirection?.question ||
      '이 방향으로 나는 어떻게 걸어가고 있을까?',
    action: record.content,
    oneWordText: record.oneWordText ?? undefined,
    tomorrowText: record.tomorrowText ?? undefined,
    moodCode: record.moodCode ?? undefined,
    imageUrl: record.imageUrl ?? undefined,
    isShared: record.visibility === 'PUBLIC',
  };
};

const hasLoggedTodayFromRecords = (records: Record[]) => {
  const today = new Date().toDateString();
  return records.some((record) => new Date(record.timestamp).toDateString() === today);
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentDirection: null,
    pastDirections: [],
    records: [],
    hasLoggedToday: false,
    hasSeenOnboarding: false,
    userLevel: 'Beginning',
    auth: { isLoggedIn: false, token: null, refreshToken: null }
  });

  const [currentView, setCurrentView] = useState<ViewState | 'INITIALIZING'>('INITIALIZING');
  const [isLoaded, setIsLoaded] = useState(false);
  const [authCodeParam, setAuthCodeParam] = useState<string | null>(null);
  const [settingsButtonHovered, setSettingsButtonHovered] = useState(false);
  const [settingsButtonPressed, setSettingsButtonPressed] = useState(false);
  const [recordGuardModalOpen, setRecordGuardModalOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readThemeMode()));
  const appFlowABgStyle = useMemo(() => buildFlowBackground(resolvedTheme), [resolvedTheme]);
  const shellFrameStyle = useMemo<React.CSSProperties>(
    () => ({
      ...appFlowABgStyle,
      boxShadow:
        resolvedTheme === 'dark'
          ? '0 24px 52px rgba(2,6,23,0.55)'
          : '0 24px 52px rgba(148,163,184,0.24)',
    }),
    [appFlowABgStyle, resolvedTheme]
  );

  useEffect(() => {
    const syncTheme = (mode?: ThemeMode) => {
      const nextMode = mode ?? readThemeMode();
      setThemeMode(nextMode);
      setResolvedTheme(resolveTheme(nextMode));
    };

    const onThemeChange = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: ThemeMode }>;
      syncTheme(custom.detail?.mode);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_STORAGE_KEY) return;
      syncTheme();
    };

    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    applyDocumentTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (currentView === 'SETTINGS') {
      setSettingsButtonHovered(false);
      setSettingsButtonPressed(false);
    }
  }, [currentView]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(resolveTheme('system'));
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [themeMode]);

  useEffect(() => {
    const initApp = async () => {
        const loaded = loadState();
        if (!loaded.auth) loaded.auth = { isLoggedIn: false, token: null, refreshToken: null };
        if (loaded.auth && typeof loaded.auth.refreshToken === 'undefined') {
          loaded.auth.refreshToken = null;
        }
        setState(loaded);

        const params = new URLSearchParams(window.location.search);
        const urlCode = params.get('code');
        const urlError = params.get('error');

        if (urlCode) {
            window.sessionStorage.setItem(OAUTH_PENDING_CODE_KEY, urlCode);
            window.sessionStorage.removeItem(OAUTH_PENDING_ERROR_KEY);
        } else if (urlError) {
            window.sessionStorage.setItem(OAUTH_PENDING_ERROR_KEY, urlError);
        }

        if (urlCode || urlError) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const pendingCode = window.sessionStorage.getItem(OAUTH_PENDING_CODE_KEY);
        const pendingError = window.sessionStorage.getItem(OAUTH_PENDING_ERROR_KEY);

        if (pendingCode) {
            setAuthCodeParam(pendingCode);
            setCurrentView('OAUTH_CALLBACK');
        } else if (pendingError) {
            setAuthCodeParam('error_user');
            setCurrentView('OAUTH_CALLBACK');
        } else if (loaded.auth.token || loaded.auth.refreshToken) {
            const restoreWithRefresh = async () => {
              let accessToken = loaded.auth.token ?? null;
              let refreshToken = loaded.auth.refreshToken ?? null;

              if (accessToken) {
                try {
                  const me = await authApi.getMe(accessToken);
                  return { me, accessToken, refreshToken };
                } catch (err) {
                  // access token 만료 가능성: refresh로 1회 복구 시도
                }
              }

              if (!refreshToken) {
                throw new Error('세션이 만료되었습니다.');
              }

              const refreshed = await authApi.refresh(refreshToken);
              accessToken = refreshed.token;
              refreshToken = refreshed.refreshToken;
              const me = await authApi.getMe(accessToken);
              return { me, accessToken, refreshToken };
            };

            try {
                const restored = await restoreWithRefresh();
                let activeDirection: Direction | null = null;
                const activePath = await pathApi.getActive(restored.accessToken);
                activeDirection = buildDirectionFromActivePath(activePath, loaded.currentDirection);
                let restoredRecords: Record[] = loaded.records || [];
                try {
                  const recordsResponse = await recordApi.getRecords(restored.accessToken);
                  restoredRecords = recordsResponse.items.map((record) =>
                    buildRecordFromResponse(record, activeDirection)
                  );
                } catch {
                  restoredRecords = loaded.records || [];
                }
                setState(prev => ({
                    ...prev,
                    currentDirection: activeDirection,
                    records: restoredRecords,
                    hasLoggedToday: hasLoggedTodayFromRecords(restoredRecords),
                    auth: {
                      isLoggedIn: true,
                      token: restored.accessToken,
                      refreshToken: restored.refreshToken,
                      onboardingStatus: restored.me.onboardingStatus
                    }
                }));
                if (restored.me.onboardingStatus === 'NEW') {
                   setCurrentView('NICKNAME_SETUP');
                } else {
                   setCurrentView('NOW');
                }
            } catch (err) {
                setState(prev => ({ ...prev, auth: { isLoggedIn: false, token: null, refreshToken: null } }));
                setCurrentView('ONBOARDING');
            }
        } else {
            if (!loaded.hasSeenOnboarding) {
                setCurrentView('ONBOARDING');
            } else {
                setCurrentView('NOW');
            }
        }
        setIsLoaded(true);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState(state);
    }
  }, [state, isLoaded]);

  const handleOnboardingComplete = async (initialDirection: Direction) => {
      let nextDirection = initialDirection;
      const token = state.auth?.token;

      if (state.auth?.isLoggedIn && token) {
        try {
          const activeDirection = await syncRemotePathAndRecords(token, state.currentDirection, false);
          if (activeDirection) {
            setCurrentView('NOW');
            return;
          }

          const createdPath = await pathApi.create(token, {
            directionName: initialDirection.description,
            categoryCode: initialDirection.categoryId || 'job',
            directionText: initialDirection.question,
            reviewAt: toLocalDateString(initialDirection.reviewAt),
          });
          nextDirection = buildDirectionFromCreatedPath(createdPath, initialDirection);
        } catch (err) {
          if (err instanceof Error && err.message.includes('이미 진행 중인 방향')) {
            await syncRemotePathAndRecords(token, state.currentDirection);
            setCurrentView('NOW');
            return;
          }
          setNoticeModal({
            title: '방향을 시작하지 못했어요',
            description: err instanceof Error ? err.message : '방향 생성에 실패했습니다.',
          });
          return;
        }
      }

      setState(prev => ({ 
          ...prev, 
          currentDirection: nextDirection,
          hasSeenOnboarding: true 
      }));
      setCurrentView('NOW');
  };

  const handleSaveLog = (record: Record, directionUpdate?: Partial<Direction>) => {
    setState(prev => {
        let currentDirection = prev.currentDirection;
        if (currentDirection && directionUpdate) {
            currentDirection = { ...currentDirection, ...directionUpdate };
        }

        return {
            ...prev,
            records: [record, ...prev.records],
            currentDirection,
            hasLoggedToday: true
        };
    });
    setCurrentView('NOW');
  };

  const handleUpdateLog = (updatedRecord: Record) => {
    setState(prev => ({
        ...prev,
        records: prev.records.map(r => r.id === updatedRecord.id ? updatedRecord : r)
    }));
  };

  const syncRemotePathAndRecords = async (
    token: string,
    fallbackDirection?: Direction | null,
    applyWhenEmpty = true
  ) => {
    const activePath = await pathApi.getActive(token);
    const activeDirection = buildDirectionFromActivePath(activePath, fallbackDirection);
    let records: Record[] = [];

    try {
      const recordsResponse = await recordApi.getRecords(token);
      records = recordsResponse.items.map((record) => buildRecordFromResponse(record, activeDirection));
    } catch {
      records = [];
    }

    if (activeDirection || applyWhenEmpty) {
      setState(prev => ({
        ...prev,
        currentDirection: activeDirection,
        records,
        hasLoggedToday: hasLoggedTodayFromRecords(records),
        hasSeenOnboarding: true,
      }));
    }

    return activeDirection;
  };

  const handleStartDirection = async (updates: Partial<Direction>) => {
    if (state.currentDirection) return;

    let newDir: Direction = {
      id: createDirectionId(),
      question: updates.question || '',
      description: updates.description || '',
      categoryId: updates.categoryId,
      categoryLabel: updates.categoryLabel,
      createdAt: Date.now(),
      reviewAt: updates.reviewAt,
      isActive: true
    };

    const token = state.auth?.token;
    if (state.auth?.isLoggedIn && token) {
      const activeDirection = await syncRemotePathAndRecords(token, state.currentDirection, false);
      if (activeDirection) {
        setCurrentView('NOW');
        return;
      }

      try {
        const createdPath = await pathApi.create(token, {
          directionName: newDir.description,
          categoryCode: newDir.categoryId || 'job',
          directionText: newDir.question,
          reviewAt: toLocalDateString(newDir.reviewAt),
        });
        newDir = buildDirectionFromCreatedPath(createdPath, newDir);
        await syncRemotePathAndRecords(token, newDir);
        setCurrentView('NOW');
        return;
      } catch (err) {
        if (err instanceof Error && err.message.includes('이미 진행 중인 방향')) {
          await syncRemotePathAndRecords(token, state.currentDirection);
          setCurrentView('NOW');
          return;
        }
        throw err;
      }
    }

    setState(prev => {
      if (prev.currentDirection) return prev;
      return {
        ...prev,
        currentDirection: newDir
      };
    });
    setCurrentView('NOW');
  };

  const handleFinishDirection = () => {
    setState(prev => {
      if (!prev.currentDirection) return prev;

      const archivedDirection = { ...prev.currentDirection, endedAt: Date.now(), isActive: false };
      
      return {
        ...prev,
        pastDirections: [archivedDirection, ...prev.pastDirections],
        currentDirection: null
      };
    });
  };

  const handleOpenLogEditor = () => {
    if (!state.currentDirection) {
      setRecordGuardModalOpen(true);
      return;
    }
    setCurrentView('WRITE_LOG');
  };

  const handleLoginSuccess = (status: 'NEW' | 'EXISTING', token: string, refreshToken: string) => {
      window.sessionStorage.removeItem(OAUTH_PENDING_CODE_KEY);
      window.sessionStorage.removeItem(OAUTH_PENDING_ERROR_KEY);
      setState(prev => ({ 
         ...prev, 
         auth: { isLoggedIn: true, token, refreshToken, onboardingStatus: status }
      }));
      
      if (status === 'NEW') {
          setCurrentView('NICKNAME_SETUP');
      } else {
          // Existing Users go to HOME. If they've never seen Onboarding, we assume they somehow bypassed it and it is now true.
          pathApi.getActive(token)
            .then(async (activePath) => {
              const activeDirection = buildDirectionFromActivePath(activePath, state.currentDirection);
              let records: Record[] = [];
              try {
                const recordsResponse = await recordApi.getRecords(token);
                records = recordsResponse.items.map((record) => buildRecordFromResponse(record, activeDirection));
              } catch {
                records = [];
              }
              setState(prev => ({
                ...prev,
                currentDirection: activeDirection,
                records,
                hasLoggedToday: hasLoggedTodayFromRecords(records),
                hasSeenOnboarding: true
              }));
            })
            .catch(() => {
              setState(prev => ({ ...prev, currentDirection: null, hasSeenOnboarding: true }));
            });
          setCurrentView('NOW');
      }
  };

  const handleLogout = async () => {
    let accessToken = state.auth.token;
    let refreshToken = state.auth.refreshToken;

    if (accessToken) {
      try {
        await authApi.logout(accessToken);
      } catch {
        if (refreshToken) {
          try {
            const refreshed = await authApi.refresh(refreshToken);
            accessToken = refreshed.token;
            refreshToken = refreshed.refreshToken;
            await authApi.logout(accessToken);
          } catch {
            // 서버 revoke 실패 시에도 로컬 세션은 종료
          }
        }
      }
    }
    setState(prev => ({ ...prev, auth: { isLoggedIn: false, token: null, refreshToken: null } }));
    setCurrentView('NOW');
  };

  const NavItem = ({ view, label }: { view: ViewState | 'INITIALIZING'; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => setCurrentView(view as ViewState)}
        className="relative flex flex-col items-center justify-center flex-1 h-full group pointer-events-auto"
      >
        <div
          className={[
            'w-[44px] h-[44px] rounded-[15px] flex items-center justify-center transition-all duration-500 ease-out z-10',
            isActive
              ? 'bg-gradient-to-br from-[#9F75FF] to-[#8B5CF6] shadow-[0_4px_12px_rgba(139,92,246,0.25)] -translate-y-[10px] scale-110'
              : 'bg-transparent hover:bg-white/40 group-hover:-translate-y-1',
          ].join(' ')}
        >
          <div className="transition-transform duration-500">
            <NavIcon view={view} active={isActive} />
          </div>
        </div>
        <span
          className={`absolute bottom-[3px] text-[9px] font-bold tracking-tight transition-all duration-500 ${
            isActive 
              ? 'text-[#8B5CF6] opacity-100 translate-y-0' 
              : 'text-slate-400 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  /* ── 1. Fullscreen Loading ── */
  if (!isLoaded || currentView === 'INITIALIZING') {
    return (
      <div className="flex h-screen w-full max-w-[430px] mx-auto items-center justify-center" style={shellFrameStyle}>
         <Compass size={32} className="animate-spin" style={{ animationDuration: '3s', color: resolvedTheme === 'dark' ? '#A78BFA' : '#8B5CF6' }} />
      </div>
    );
  }

  /* ── 2. Fullscreen Auth Related Views ── */
  if (currentView === 'ACCOUNT_CONNECT') {
      return (
          <div className="min-h-screen max-w-[430px] mx-auto relative" style={shellFrameStyle}>
             <AccountConnectView 
                onBack={() => setCurrentView('ONBOARDING')}
                onStartKakao={() => authApi.startKakaoLogin()}
                onNavigateToMockKakao={(code) => {
                    // 테스트 플로우: 리로드 없이 OAuth 화면으로 전환
                    setAuthCodeParam(code);
                    setCurrentView('OAUTH_CALLBACK');
                }}
             />
          </div>
      );
  }

  if (currentView === 'OAUTH_CALLBACK') {
      return (
        <div className="min-h-screen max-w-[430px] mx-auto relative overflow-hidden" style={shellFrameStyle}>
           <OAuthCallbackView
             authCode={authCodeParam || ''}
             onSuccess={handleLoginSuccess}
             onRetry={() => {
               window.sessionStorage.removeItem(OAUTH_PENDING_CODE_KEY);
               window.sessionStorage.removeItem(OAUTH_PENDING_ERROR_KEY);
               setCurrentView('ACCOUNT_CONNECT');
             }}
           />
        </div>
      );
  }

  if (currentView === 'NICKNAME_SETUP') {
      return (
          <div className="min-h-screen max-w-[430px] mx-auto relative overflow-hidden" style={shellFrameStyle}>
             <NicknameSetupView 
                onComplete={async (nickname) => {
                   const token = state.auth.token;
                   if (token) {
                      try {
                        const me = await authApi.updateNickname(token, nickname);
                        await syncRemotePathAndRecords(token, state.currentDirection);
                      setState(prev => ({
                          ...prev,
                          auth: {
                            ...prev.auth,
                            onboardingStatus: me.onboardingStatus
                          },
                          hasSeenOnboarding: true
                        }));
                      } catch (err: any) {
                        setNoticeModal({
                          title: '닉네임을 저장하지 못했어요',
                          description: err?.message || '닉네임 저장에 실패했습니다.',
                        });
                        return;
                      }
                   } else {
                      setState(prev => ({ ...prev, hasSeenOnboarding: true }));
                   }
                   setCurrentView('NOW');
                }}
             />
          </div>
      );
  }

  if (currentView === 'ONBOARDING') {
      // 신규 유저가 방향 설정을 위해 넘어온 경우 처리를 위해,
      // OnboardingView 내부 로직 대신 App에서 hasSeenOnboarding이 false면서 isLoggedIn이면
      // 시작 화면 대신 방향 설정 뷰로 보내는 방식으로 처리해야 하지만 현재 OnboardingView는 상태를 자체관리합니다.
      // E2E 상, 로그인된 상태로 온보딩이 마운트되면 이미 유저이므로 (아니면 신규 가입 프로세스 중이므로)
      // OnboardingView 측에서 닉네임 후 처리 여부를 알 수 있도록 해야 합니다.
      // 간략히 'ACCOUNT_CONNECT'만 호출하도록 수정된 OnboardingView를 띄웁니다. 
      // 만약 이미 auth.isLoggedIn이면 무조건 Step 1(카테고리 선택)을 보여주는 로직을 OnboardingView 내에 구현해야 하지만
      // OnboardingView를 살짝 편법으로 우회/조작 가능합니다.
      return (
        <div className="min-h-screen max-w-[430px] mx-auto relative overflow-hidden" style={shellFrameStyle}>
            <OnboardingView 
                onComplete={handleOnboardingComplete} 
                onStartAuth={() => setCurrentView('ACCOUNT_CONNECT')}
                onStartGuest={() => {
                   setState(prev => ({ ...prev, hasSeenOnboarding: true }));
                   setCurrentView('NOW');
                }}
                initialStep={state.auth?.isLoggedIn ? 1 : 0}
            />
        </div>
      );
  }

  /* ── 3. Main App Layout (Header + Bottom Nav) ── */
  return (
    <div
      className="min-h-screen max-w-[430px] mx-auto relative flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={shellFrameStyle}
    >
      
      {/* Header Overlay (Gradient Blur) */}
      {currentView !== 'SETTINGS' && (
        <div 
          className="sticky top-0 h-20 -mb-20 z-20 pointer-events-none transition-opacity duration-500"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
            backgroundColor: resolvedTheme === 'dark' ? 'rgba(15,23,42,0.5)' : 'rgba(255, 255, 255, 0.4)',
          }}
        />
      )}

      {/* Top Bar */}
      {currentView !== 'SETTINGS' && (
        <div className="h-14 flex items-center justify-between px-8 z-30 sticky top-0 bg-transparent">
          <div className="w-6" />
          <h1
            className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-80"
            style={{ color: resolvedTheme === 'dark' ? '#CBD5E1' : '#7B8794' }}
          >
            Quiet Path
          </h1>
          <button 
            onClick={() => {
              setSettingsButtonHovered(false);
              setSettingsButtonPressed(false);
              setCurrentView('SETTINGS');
            }}
            onMouseEnter={() => setSettingsButtonHovered(true)}
            onMouseLeave={() => {
              setSettingsButtonHovered(false);
              setSettingsButtonPressed(false);
            }}
            onPointerDown={() => setSettingsButtonPressed(true)}
            onPointerUp={() => setSettingsButtonPressed(false)}
            onPointerCancel={() => setSettingsButtonPressed(false)}
            aria-label="설정 열기"
            className="group cursor-pointer rounded-full p-2 transition-all duration-200 focus-visible:outline-none"
            style={{
              cursor: 'pointer',
              color: settingsButtonPressed
                ? resolvedTheme === 'dark'
                  ? '#EDE9FE'
                  : '#6D28D9'
                : settingsButtonHovered
                  ? resolvedTheme === 'dark'
                    ? '#E9D5FF'
                    : '#7C3AED'
                  : resolvedTheme === 'dark'
                    ? '#94A3B8'
                    : '#64748B',
              backgroundColor: settingsButtonPressed
                ? resolvedTheme === 'dark'
                  ? 'rgba(88,28,135,0.56)'
                  : 'rgba(237,233,254,0.98)'
                : settingsButtonHovered
                  ? resolvedTheme === 'dark'
                    ? 'rgba(51,65,85,0.86)'
                    : 'rgba(255,255,255,0.96)'
                  : resolvedTheme === 'dark'
                    ? 'rgba(15,23,42,0.18)'
                    : 'rgba(255,255,255,0.28)',
              boxShadow: settingsButtonPressed
                ? resolvedTheme === 'dark'
                  ? '0 14px 30px rgba(15,23,42,0.40), 0 0 0 1px rgba(196,181,253,0.28) inset'
                  : '0 12px 28px rgba(148,163,184,0.24), 0 0 0 1px rgba(124,58,237,0.10) inset'
                : settingsButtonHovered
                  ? resolvedTheme === 'dark'
                    ? '0 12px 28px rgba(15,23,42,0.32), 0 0 0 1px rgba(196,181,253,0.18) inset'
                    : '0 10px 24px rgba(148,163,184,0.18), 0 0 0 1px rgba(124,58,237,0.08) inset'
                  : 'none',
              transform: settingsButtonPressed
                ? 'scale(0.95)'
                : settingsButtonHovered
                  ? 'scale(1.08)'
                  : 'scale(1)',
            }}
          >
            <Settings
              size={18}
              className="transition-transform duration-200"
              style={{
                transform: settingsButtonPressed
                  ? 'rotate(28deg) scale(0.97)'
                  : settingsButtonHovered
                    ? 'rotate(18deg)'
                    : 'rotate(0deg)',
              }}
            />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className={currentView === 'SETTINGS' ? 'flex-1 px-0 pt-0 pb-0' : 'flex-1 px-6 pt-2 pb-32'}>
        {currentView === 'NOW' && (
          <HomeView 
            state={state} 
            onLogClick={handleOpenLogEditor}
            onStartDirectionClick={() => setCurrentView('DIRECTION')}
            onHistoryClick={() => setCurrentView('PAST_DIRECTIONS')}
            onRecordsClick={() => setCurrentView('RECORDS')}
          />
        )}
        {currentView === 'RECORDS' && (
          <RecordsView
            records={state.records}
            currentDirection={state.currentDirection}
            pastDirections={state.pastDirections}
            onUpdateRecord={handleUpdateLog}
            hasLoggedToday={state.hasLoggedToday}
            onLogClick={handleOpenLogEditor}
            accessToken={state.auth?.token}
            onLoginRequired={() => setCurrentView('ACCOUNT_CONNECT')}
          />
        )}
        {currentView === 'DIRECTION' && (
          <DirectionView 
            currentDirection={state.currentDirection} 
            records={state.records}
            onStartDirection={handleStartDirection}
            onFinishDirection={handleFinishDirection}
            onHistoryClick={() => setCurrentView('PAST_DIRECTIONS')}
          />
        )}
        {currentView === 'COMMUNITY' && (
           <CommunityView 
              accessToken={state.auth?.token}
              isGuest={!state.auth?.isLoggedIn}
              onLoginClick={() => setCurrentView('ACCOUNT_CONNECT')}
           />
        )}
        {currentView === 'PAST_DIRECTIONS' && (
            <PastDirectionsView 
                pastDirections={state.pastDirections} 
                records={state.records}
                onBack={() => setCurrentView('DIRECTION')} 
            />
        )}
        {currentView === 'SETTINGS' && (
           <SettingsView
              state={state}
              onClose={() => {
                setSettingsButtonHovered(false);
                setSettingsButtonPressed(false);
                setCurrentView('NOW');
              }}
              onLogin={() => setCurrentView('ACCOUNT_CONNECT')}
              onLogout={handleLogout}
           />
        )}
      </main>

      {/* Modal View for Logging */}
      {currentView === 'WRITE_LOG' && (
        <DailyRecordEditorView 
          state={state} 
          onSave={handleSaveLog} 
          onStartDirection={() => setCurrentView('DIRECTION')}
          onCancel={() => setCurrentView('NOW')} 
        />
      )}

      <AppModal
        open={recordGuardModalOpen}
        icon={<Compass size={22} />}
        title="먼저 방향이 필요해요"
        description={
          <>
            기록은 현재 방향 위에서만 남길 수 있어요.
            <br />
            새 방향을 시작한 뒤 기록을 이어가 주세요.
          </>
        }
        confirmLabel="방향 시작하러 가기"
        cancelLabel="닫기"
        onClose={() => setRecordGuardModalOpen(false)}
        onConfirm={() => {
          setRecordGuardModalOpen(false);
          setCurrentView('DIRECTION');
        }}
      />

      <AppModal
        open={noticeModal !== null}
        icon={<AlertCircle size={22} />}
        title={noticeModal?.title ?? ''}
        description={noticeModal?.description ?? ''}
        confirmLabel="확인"
        hideCancel
        confirmVariant="danger"
        onClose={() => setNoticeModal(null)}
        onConfirm={() => setNoticeModal(null)}
      />

      {/* Floating Bottom Navigation */}
      {currentView !== 'WRITE_LOG' && currentView !== 'SETTINGS' && (
        <div className="fixed bottom-6 left-0 w-full flex justify-center z-40 px-6 pointer-events-none">
           <nav
             className="h-[64px] px-2 backdrop-blur-2xl rounded-[28px] flex items-center justify-between w-full max-w-[340px] pointer-events-auto"
             style={{
               background: resolvedTheme === 'dark' ? 'rgba(15,23,42,0.86)' : 'rgba(255,255,255,0.94)',
               border: `1px solid ${resolvedTheme === 'dark' ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.8)'}`,
               boxShadow: resolvedTheme === 'dark'
                 ? '0 12px 40px rgba(2,6,23,0.52)'
                 : '0 12px 40px rgba(0,0,0,0.06)',
             }}
           >
             <NavItem view="NOW" label="오늘" />
             <NavItem view="RECORDS" label="기록" />
             <NavItem view="COMMUNITY" label="둘러보기" />
             <NavItem view="DIRECTION" label="여정" />
          </nav>
        </div>
      )}
    </div>
  );
};

export default App;
