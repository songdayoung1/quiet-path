import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ViewState, Record, Direction } from './types';
import { loadState, saveState, createDirectionId, persistAuthState } from './storage';
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
import { configureApiClient } from './api/apiClient';
import type { ApiErrorWithStatus } from './api/apiClient';
import { authApi, isMockAccessToken } from './api/authApi';
import { pathApi, PastPathListItem, PathActiveResponse, PathCreateResponse } from './api/pathApi';
import { recordApi, RecordResponse } from './api/recordApi';
import { Settings, Compass, AlertCircle } from 'lucide-react';
import { AppModal } from './components/AppModal';
import { CATEGORIES } from './constants';
import { getCurrentPathTodayRecord, hasLoggedTodayForCurrentPath } from './utils/recordScope';

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

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildFutureDateInputValue = (daysFromToday: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return formatDateInputValue(date);
};

const MIN_DIRECTION_LOADING_MS = 900;

const waitForMinimumDuration = async (startedAt: number, minimumMs: number) => {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= minimumMs) {
    return;
  }
  await new Promise((resolve) => window.setTimeout(resolve, minimumMs - elapsed));
};

const parseLocalDateString = (value?: string) => {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`).getTime();
};

const isDirectionExpired = (direction?: Direction | null) => {
  if (!direction || !direction.isActive || !direction.reviewAt) {
    return false;
  }
  if (direction.expired === true) {
    return true;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const reviewDate = new Date(direction.reviewAt);
  const reviewStart = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate()).getTime();
  return reviewStart < todayStart;
};

const buildDirectionFromActivePath = (
  path: PathActiveResponse,
  fallback?: Direction | null
): Direction | null => {
  if (!path.pathId) return null;
  const category = CATEGORIES.find((item) => item.id === path.categoryCode);
  const reviewAt = parseLocalDateString(path.reviewAt) ?? fallback?.reviewAt;
  return {
    id: String(path.pathId),
    question: path.directionText || fallback?.question || '이 방향으로 나는 어떻게 걸어가고 있을까?',
    description: path.directionName || fallback?.description || '지금의 방향',
    categoryId: path.categoryCode || fallback?.categoryId,
    categoryLabel: category?.label || fallback?.categoryLabel,
    createdAt: parseLocalDateString(path.createdAt) ?? fallback?.createdAt ?? Date.now(),
    reviewAt,
    isActive: path.status ? path.status === 'ACTIVE' : true,
    expired:
      typeof path.expired === 'boolean'
        ? path.expired
        : isDirectionExpired({
            id: String(path.pathId),
            question: '',
            description: '',
            createdAt: parseLocalDateString(path.createdAt) ?? fallback?.createdAt ?? Date.now(),
            reviewAt,
            isActive: path.status ? path.status === 'ACTIVE' : true,
          }),
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
  expired: false,
});

const buildDirectionFromPastPath = (path: PastPathListItem): Direction => ({
  id: String(path.pathId),
  question: path.directionName,
  description: path.directionName,
  createdAt: parseLocalDateString(path.createdAt) ?? Date.now(),
  endedAt: parseLocalDateString(path.completedAt ?? undefined),
  isActive: false,
  expired: false,
});

const buildRecordFromResponse = (
  record: RecordResponse,
  fallbackDirection?: Direction | null
): Record => {
  const createdAt = record.createdAt || `${record.recordDate}T00:00:00`;
  return {
    id: String(record.id),
    pathId: String(record.pathId),
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
    isPinned: record.isPinned ?? undefined,
  };
};

const upsertRecord = (records: Record[], nextRecord: Record) => {
  const exists = records.some((record) => record.id === nextRecord.id);
  if (!exists) {
    return [nextRecord, ...records];
  }
  return records.map((record) => (record.id === nextRecord.id ? nextRecord : record));
};

const clearServerDrivenState = (prev: AppState): AppState => ({
  ...prev,
  currentDirection: null,
  pastDirections: [],
  records: [],
  hasLoggedToday: false,
  userLevel: 'Beginning',
});

type ExpiredDirectionResolutionState = {
  directionId: string;
  afterExtendView: ViewState;
  afterFinishView: ViewState;
};

const isRefreshSessionInvalid = (error: unknown) => {
  const status = (error as ApiErrorWithStatus | undefined)?.status;
  return status === 400 || status === 401;
};

const getAuthErrorDebugInfo = (error: unknown) => ({
  status: (error as ApiErrorWithStatus | undefined)?.status,
  code: (error as ApiErrorWithStatus | undefined)?.code,
  message: error instanceof Error ? error.message : 'unknown error',
});

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentDirection: null,
    pastDirections: [],
    records: [],
    hasLoggedToday: false,
    hasSeenOnboarding: false,
    userLevel: 'Beginning',
    auth: { isLoggedIn: false, token: null, userId: null }
  });

  const [currentView, setCurrentView] = useState<ViewState | 'INITIALIZING'>('INITIALIZING');
  const [isLoaded, setIsLoaded] = useState(false);
  const [authCodeParam, setAuthCodeParam] = useState<string | null>(null);
  const [settingsButtonHovered, setSettingsButtonHovered] = useState(false);
  const [settingsButtonPressed, setSettingsButtonPressed] = useState(false);
  const [isHomeDataLoading, setIsHomeDataLoading] = useState(false);
  const [recordGuardModalOpen, setRecordGuardModalOpen] = useState(false);
  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [expiredDirectionResolution, setExpiredDirectionResolution] = useState<ExpiredDirectionResolutionState | null>(null);
  const [expiredDirectionReviewAt, setExpiredDirectionReviewAt] = useState(() => buildFutureDateInputValue(7));
  const [isExpiredDirectionResolving, setIsExpiredDirectionResolving] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readThemeMode()));
  const refreshAuthRequestRef = useRef<Promise<string | null> | null>(null);
  const hasInitializedAppRef = useRef(false);
  const minExpiredDirectionReviewAt = buildFutureDateInputValue(1);
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
    if (!expiredDirectionResolution) {
      return;
    }
    if (
      !state.currentDirection ||
      state.currentDirection.id !== expiredDirectionResolution.directionId ||
      !isDirectionExpired(state.currentDirection)
    ) {
      setExpiredDirectionResolution(null);
    }
  }, [expiredDirectionResolution, state.currentDirection]);

  useEffect(() => {
    // StrictMode의 개발 환경 effect 재실행으로 refresh token이 두 번 회전하는 것을 막는다.
    if (hasInitializedAppRef.current) {
      return;
    }
    hasInitializedAppRef.current = true;

    const initApp = async () => {
        const loaded = loadState();
        if (!loaded.auth) loaded.auth = { isLoggedIn: false, token: null, userId: null };
        if (loaded.auth && typeof loaded.auth.userId === 'undefined') {
          loaded.auth.userId = null;
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
        } else {
            const restoreWithRefresh = async () => {
              let accessToken = loaded.auth.token ?? null;

              if (accessToken) {
                try {
                  const me = await authApi.getMe(accessToken, { retryOnUnauthorized: false });
                  return { me, accessToken };
                } catch (err) {
                  // access token 만료 가능성: refresh로 1회 복구 시도
                }
              }

              const refreshed = await authApi.refresh();
              accessToken = refreshed.token;
              const me = await authApi.getMe(accessToken, { retryOnUnauthorized: false });
              return { me, accessToken };
            };

            try {
                const restored = await restoreWithRefresh();
                let activeDirection: Direction | null = null;
                const activePath = await pathApi.getActive(restored.accessToken);
                activeDirection = buildDirectionFromActivePath(activePath, null);
                let restoredRecords: Record[] = [];
                let restoredPastDirections: Direction[] = [];
                try {
                  const recordsResponse = await recordApi.getRecords(restored.accessToken);
                  restoredRecords = recordsResponse.items.map((record) =>
                    buildRecordFromResponse(record, activeDirection)
                  );
                } catch {
                  restoredRecords = [];
                }
                try {
                  const pastPathsResponse = await pathApi.getPastPaths(restored.accessToken);
                  restoredPastDirections = pastPathsResponse.items.map(buildDirectionFromPastPath);
                } catch {
                  restoredPastDirections = [];
                }
                setState(prev => ({
                    ...prev,
                    currentDirection: activeDirection,
                    pastDirections: restoredPastDirections,
                    records: restoredRecords,
                    hasLoggedToday: hasLoggedTodayForCurrentPath(restoredRecords, activeDirection),
                    auth: {
                      isLoggedIn: true,
                      token: restored.accessToken,
                      userId: restored.me.id,
                      onboardingStatus: restored.me.onboardingStatus
                    }
                }));
                persistAuthState(
                  {
                    isLoggedIn: true,
                    token: restored.accessToken,
                    userId: restored.me.id,
                    onboardingStatus: restored.me.onboardingStatus,
                  },
                  { hasSeenOnboarding: loaded.hasSeenOnboarding }
                );
                if (restored.me.onboardingStatus === 'NEW') {
                   setCurrentView('NICKNAME_SETUP');
                } else {
                   setCurrentView('NOW');
                }
            } catch (err) {
                if (isRefreshSessionInvalid(err)) {
                  setState(prev => ({
                    ...clearServerDrivenState(prev),
                    auth: { isLoggedIn: false, token: null, userId: null }
                  }));
                  persistAuthState(
                    { isLoggedIn: false, token: null, userId: null },
                    { hasSeenOnboarding: loaded.hasSeenOnboarding, clearServerState: true }
                  );
                  setCurrentView(loaded.hasSeenOnboarding ? 'NOW' : 'ONBOARDING');
                } else {
                  setCurrentView(loaded.hasSeenOnboarding ? 'NOW' : 'ONBOARDING');
                }
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
          const createdPath = await pathApi.create(token, {
            directionName: initialDirection.description,
            categoryCode: initialDirection.categoryId || 'job',
            directionText: initialDirection.question,
            reviewAt: toLocalDateString(initialDirection.reviewAt),
          });
          nextDirection = buildDirectionFromCreatedPath(createdPath, initialDirection);
        } catch (err) {
          if (isPathAlreadyActiveError(err) || isPathReviewRequiredError(err)) {
            const activeDirection = await syncRemotePathAndRecords(token, state.currentDirection);
            if (activeDirection && isDirectionExpired(activeDirection)) {
              openExpiredDirectionResolution(activeDirection, 'DIRECTION', 'DIRECTION');
              return;
            }
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
          hasLoggedToday: hasLoggedTodayForCurrentPath(prev.records, nextDirection),
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

        const records = upsertRecord(prev.records, record);

        return {
            ...prev,
            records,
            currentDirection,
            hasLoggedToday: hasLoggedTodayForCurrentPath(records, currentDirection)
        };
    });
    setCurrentView('NOW');
  };

  const handleUpdateLog = (updatedRecord: Record) => {
    setState(prev => {
      const records = prev.records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      return {
        ...prev,
        records,
        hasLoggedToday: hasLoggedTodayForCurrentPath(records, prev.currentDirection),
      };
    });
  };

  const handleDeleteLog = (recordId: string) => {
    setState(prev => {
      const records = prev.records.filter((record) => record.id !== recordId);
      return {
        ...prev,
        records,
        hasLoggedToday: hasLoggedTodayForCurrentPath(records, prev.currentDirection),
      };
    });
  };

  const syncRemotePathAndRecords = async (
    token: string,
    fallbackDirection?: Direction | null,
    applyWhenEmpty = true
  ) => {
    const activePath = await pathApi.getActive(token);
    const activeDirection = buildDirectionFromActivePath(activePath, fallbackDirection);
    let records: Record[] = [];
    let pastDirections: Direction[] = [];

    try {
      const recordsResponse = await recordApi.getRecords(token);
      records = recordsResponse.items.map((record) => buildRecordFromResponse(record, activeDirection));
    } catch {
      records = [];
    }

    try {
      const pastPathsResponse = await pathApi.getPastPaths(token);
      pastDirections = pastPathsResponse.items.map(buildDirectionFromPastPath);
    } catch {
      pastDirections = [];
    }

    if (activeDirection || applyWhenEmpty) {
      setState(prev => ({
        ...prev,
        currentDirection: activeDirection,
        pastDirections,
        records,
        hasLoggedToday: hasLoggedTodayForCurrentPath(records, activeDirection),
        hasSeenOnboarding: true,
      }));
    }

    return activeDirection;
  };

  const isPathReviewRequiredError = (error: unknown) =>
    (error as ApiErrorWithStatus | undefined)?.code === 'PATH_REVIEW_REQUIRED';

  const isPathAlreadyActiveError = (error: unknown) =>
    (error as ApiErrorWithStatus | undefined)?.code === 'PATH_ALREADY_ACTIVE';

  const openExpiredDirectionResolution = (
    direction: Direction,
    afterExtendView: ViewState,
    afterFinishView: ViewState,
  ) => {
    setExpiredDirectionReviewAt(buildFutureDateInputValue(7));
    setExpiredDirectionResolution({
      directionId: direction.id,
      afterExtendView,
      afterFinishView,
    });
  };

  const requestExpiredDirectionResolution = (
    afterExtendView: ViewState,
    afterFinishView: ViewState,
    direction = state.currentDirection,
  ) => {
    if (!direction || !isDirectionExpired(direction)) {
      return false;
    }
    openExpiredDirectionResolution(direction, afterExtendView, afterFinishView);
    return true;
  };

  const handleExpiredDirectionRequirement = async (
    token: string,
    afterExtendView: ViewState,
    afterFinishView: ViewState,
  ) => {
    const activeDirection = await syncRemotePathAndRecords(token, state.currentDirection);
    if (activeDirection && isDirectionExpired(activeDirection)) {
      openExpiredDirectionResolution(activeDirection, afterExtendView, afterFinishView);
      return true;
    }
    return false;
  };

  const finishDirection = async (afterSuccessView?: ViewState) => {
    const currentDirection = state.currentDirection;
    if (!currentDirection) return false;

    const token = state.auth?.token;
    if (state.auth?.isLoggedIn && token) {
      const pathId = Number(currentDirection.id);
      if (!Number.isInteger(pathId)) {
        setNoticeModal({
          title: '방향을 마무리하지 못했어요',
          description: '현재 방향 정보를 다시 불러온 뒤 시도해 주세요.',
        });
        return false;
      }

      try {
        const response = await pathApi.finish(token, pathId);
        const completedAt = response.completedAt ? new Date(response.completedAt).getTime() : Date.now();
        setState(prev => {
          if (!prev.currentDirection || prev.currentDirection.id !== currentDirection.id) {
            return prev;
          }

          const archivedDirection = {
            ...prev.currentDirection,
            endedAt: completedAt,
            isActive: false,
            expired: false,
          };

          return {
            ...prev,
            pastDirections: [archivedDirection, ...prev.pastDirections],
            currentDirection: null,
            hasLoggedToday: false,
          };
        });
        if (afterSuccessView) {
          setCurrentView(afterSuccessView);
        }
        return true;
      } catch (err) {
        setNoticeModal({
          title: '방향을 마무리하지 못했어요',
          description: err instanceof Error ? err.message : '방향 종료에 실패했습니다.',
        });
        return false;
      }
    }

    setState(prev => {
      if (!prev.currentDirection) return prev;

      const archivedDirection = {
        ...prev.currentDirection,
        endedAt: Date.now(),
        isActive: false,
        expired: false,
      };

      return {
        ...prev,
        pastDirections: [archivedDirection, ...prev.pastDirections],
        currentDirection: null,
        hasLoggedToday: false,
      };
    });
    if (afterSuccessView) {
      setCurrentView(afterSuccessView);
    }
    return true;
  };

  const handleExtendExpiredDirection = async () => {
    const resolution = expiredDirectionResolution;
    const currentDirection = state.currentDirection;
    if (
      !resolution ||
      !currentDirection ||
      !expiredDirectionReviewAt ||
      expiredDirectionReviewAt < minExpiredDirectionReviewAt
    ) {
      return;
    }

    setIsExpiredDirectionResolving(true);

    try {
      const token = state.auth?.token;
      const nextReviewAt = parseLocalDateString(expiredDirectionReviewAt);

      if (state.auth?.isLoggedIn && token) {
        const pathId = Number(currentDirection.id);
        if (!Number.isInteger(pathId)) {
          throw new Error('현재 방향 정보를 다시 불러온 뒤 시도해 주세요.');
        }

        const response = await pathApi.extendReviewAt(token, pathId, expiredDirectionReviewAt);
        setState(prev => {
          if (!prev.currentDirection || prev.currentDirection.id !== currentDirection.id) {
            return prev;
          }
          return {
            ...prev,
            currentDirection: {
              ...prev.currentDirection,
              reviewAt: parseLocalDateString(response.reviewAt) ?? nextReviewAt,
              expired: response.expired,
            },
          };
        });
      } else {
        setState(prev => {
          if (!prev.currentDirection || prev.currentDirection.id !== currentDirection.id) {
            return prev;
          }
          return {
            ...prev,
            currentDirection: {
              ...prev.currentDirection,
              reviewAt: nextReviewAt,
              expired: false,
            },
          };
        });
      }

      setExpiredDirectionResolution(null);
      setCurrentView(resolution.afterExtendView);
    } catch (error) {
      const token = state.auth?.token;
      if (state.auth?.isLoggedIn && token && isPathReviewRequiredError(error)) {
        await handleExpiredDirectionRequirement(
          token,
          resolution.afterExtendView,
          resolution.afterFinishView,
        );
        return;
      }

      setNoticeModal({
        title: '회고일을 연장하지 못했어요',
        description: error instanceof Error ? error.message : '회고일 연장에 실패했습니다.',
      });
    } finally {
      setIsExpiredDirectionResolving(false);
    }
  };

  const handleFinishExpiredDirection = async () => {
    if (!expiredDirectionResolution) {
      return;
    }

    setIsExpiredDirectionResolving(true);
    try {
      const finished = await finishDirection(expiredDirectionResolution.afterFinishView);
      if (finished) {
        setExpiredDirectionResolution(null);
      }
    } finally {
      setIsExpiredDirectionResolving(false);
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshAuthRequestRef.current) {
      return refreshAuthRequestRef.current;
    }

    refreshAuthRequestRef.current = (async () => {
      try {
        const refreshed = await authApi.refresh();
        let nextUserId = state.auth.userId ?? null;

        try {
          const me = await authApi.getMe(refreshed.token, { retryOnUnauthorized: false });
          nextUserId = me.id;
        } catch {
          nextUserId = state.auth.userId ?? null;
        }

        setState(prev => ({
          ...prev,
          auth: {
            ...prev.auth,
            isLoggedIn: true,
            token: refreshed.token,
            userId: nextUserId ?? prev.auth.userId ?? null,
          },
        }));
        persistAuthState(
          {
            isLoggedIn: true,
            token: refreshed.token,
            userId: nextUserId,
            onboardingStatus: state.auth.onboardingStatus,
          },
          { hasSeenOnboarding: state.hasSeenOnboarding }
        );

        return refreshed.token;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[auth] refresh failed', getAuthErrorDebugInfo(error));
        }
        if (isRefreshSessionInvalid(error)) {
          setState(prev => ({
            ...clearServerDrivenState(prev),
            auth: { isLoggedIn: false, token: null, userId: null },
          }));
          persistAuthState(
            { isLoggedIn: false, token: null, userId: null },
            { hasSeenOnboarding: state.hasSeenOnboarding, clearServerState: true }
          );
        }
        return null;
      } finally {
        refreshAuthRequestRef.current = null;
      }
    })();

    return refreshAuthRequestRef.current;
  }, [state.auth.onboardingStatus, state.auth.userId, state.hasSeenOnboarding]);

  useEffect(() => {
    configureApiClient({ refreshAccessToken });

    return () => {
      configureApiClient({ refreshAccessToken: null });
    };
  }, [refreshAccessToken]);

  const handleStartDirection = async (updates: Partial<Direction>) => {
    if (state.currentDirection) return;
    const startedAt = Date.now();

    let newDir: Direction = {
      id: createDirectionId(),
      question: updates.question || '',
      description: updates.description || '',
      categoryId: updates.categoryId,
      categoryLabel: updates.categoryLabel,
      createdAt: Date.now(),
      reviewAt: updates.reviewAt,
      isActive: true,
      expired: false,
    };

    const token = state.auth?.token;
    if (state.auth?.isLoggedIn && token) {
      try {
        const createdPath = await pathApi.create(token, {
          directionName: newDir.description,
          categoryCode: newDir.categoryId || 'job',
          directionText: newDir.question,
          reviewAt: toLocalDateString(newDir.reviewAt),
        });
        newDir = buildDirectionFromCreatedPath(createdPath, newDir);
      } catch (err) {
        if (isPathAlreadyActiveError(err)) {
          const activeDirection = await syncRemotePathAndRecords(token, state.currentDirection);
          if (activeDirection && isDirectionExpired(activeDirection)) {
            openExpiredDirectionResolution(activeDirection, 'DIRECTION', 'DIRECTION');
            return;
          }
          setCurrentView('NOW');
          return;
        }
        if (isPathReviewRequiredError(err)) {
          const handled = await handleExpiredDirectionRequirement(token, 'DIRECTION', 'DIRECTION');
          if (handled) {
            return;
          }
          setCurrentView('DIRECTION');
          return;
        }
        throw err;
      }
    }

    setState(prev => ({
      ...prev,
      currentDirection: newDir,
      hasLoggedToday: hasLoggedTodayForCurrentPath(prev.records, newDir),
      hasSeenOnboarding: true,
    }));
    await waitForMinimumDuration(startedAt, MIN_DIRECTION_LOADING_MS);
    setCurrentView('NOW');
  };

  const handleFinishDirection = async () => {
    await finishDirection();
  };

  const handleOpenDirectionView = () => {
    if (requestExpiredDirectionResolution('DIRECTION', 'DIRECTION')) {
      return;
    }
    setCurrentView('DIRECTION');
  };

  const handleOpenLogEditor = () => {
    if (!state.currentDirection) {
      setRecordGuardModalOpen(true);
      return;
    }
    if (requestExpiredDirectionResolution('WRITE_LOG', 'DIRECTION')) {
      return;
    }
    setCurrentView('WRITE_LOG');
  };

  const handleLoginSuccess = async (status: 'NEW' | 'EXISTING', token: string) => {
      window.sessionStorage.removeItem(OAUTH_PENDING_CODE_KEY);
      window.sessionStorage.removeItem(OAUTH_PENDING_ERROR_KEY);

      let me: Awaited<ReturnType<typeof authApi.getMe>> | null = null;
      try {
        me = await authApi.getMe(token, { retryOnUnauthorized: false });
      } catch {
        me = null;
      }

      setState(prev => ({
         ...clearServerDrivenState(prev),
         hasSeenOnboarding: true,
         auth: {
           isLoggedIn: true,
           token,
           userId: me?.id ?? null,
           onboardingStatus: status,
         }
      }));
      persistAuthState(
        {
          isLoggedIn: true,
          token,
          userId: me?.id ?? null,
          onboardingStatus: status,
        },
        { hasSeenOnboarding: true }
      );
      if (status === 'NEW') {
          setCurrentView('NICKNAME_SETUP');
      } else {
          // Existing Users go to HOME. Show skeleton while fetching path + records.
          setIsHomeDataLoading(true);
          setCurrentView('NOW');
          syncRemotePathAndRecords(token, null)
            .catch(() => {
              setState(prev => ({
                ...clearServerDrivenState(prev),
                auth: {
                  ...prev.auth,
                  isLoggedIn: true,
                  token,
                  userId: me?.id ?? prev.auth.userId ?? null,
                  onboardingStatus: status,
                },
                hasSeenOnboarding: true,
              }));
            })
            .finally(() => {
              setIsHomeDataLoading(false);
            });
      }
  };

  const handleLogout = async () => {
    const accessToken = state.auth.token;
    if (!accessToken || !isMockAccessToken(accessToken)) {
      await authApi.logout().catch(() => undefined);
    }
    setState(prev => ({
      ...clearServerDrivenState(prev),
      auth: { isLoggedIn: false, token: null, userId: null },
    }));
    persistAuthState(
      { isLoggedIn: false, token: null, userId: null },
      { hasSeenOnboarding: state.hasSeenOnboarding, clearServerState: true }
    );
    setCurrentView('NOW');
  };

  const currentPathTodayRecord = getCurrentPathTodayRecord(state.records, state.currentDirection);

  const NavItem = ({ view, label }: { view: ViewState | 'INITIALIZING'; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => {
          if (view === 'DIRECTION') {
            handleOpenDirectionView();
            return;
          }
          setCurrentView(view as ViewState);
        }}
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
                            userId: me.id,
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
            onStartDirectionClick={handleOpenDirectionView}
            onHistoryClick={() => setCurrentView('PAST_DIRECTIONS')}
            onRecordsClick={() => setCurrentView('RECORDS')}
            isHomeDataLoading={isHomeDataLoading}
          />
        )}
        {currentView === 'RECORDS' && (
          <RecordsView
            records={state.records}
            onUpdateRecord={handleUpdateLog}
            onDeleteRecord={handleDeleteLog}
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
              currentUserId={state.auth?.userId}
              isGuest={!state.auth?.isLoggedIn}
              onLoginClick={() => setCurrentView('ACCOUNT_CONNECT')}
           />
        )}
        {currentView === 'PAST_DIRECTIONS' && (
            <PastDirectionsView 
                pastDirections={state.pastDirections} 
                records={state.records}
                accessToken={state.auth?.token}
                onLoginRequired={() => setCurrentView('ACCOUNT_CONNECT')}
                onBack={handleOpenDirectionView}
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
          initialRecord={currentPathTodayRecord}
          onSave={handleSaveLog} 
          onStartDirection={handleOpenDirectionView}
          onExpiredDirectionRequired={() => {
            requestExpiredDirectionResolution('WRITE_LOG', 'DIRECTION');
          }}
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
          handleOpenDirectionView();
        }}
      />

      <AppModal
        open={expiredDirectionResolution !== null}
        icon={<Compass size={22} />}
        title="회고일이 지난 방향이에요"
        description={
          <div className="text-left">
            <p>
              기록을 남기거나 새 방향을 시작하기 전에,
              <br />
              현재 방향을 연장하거나 마무리해 주세요.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="grid grid-cols-3 gap-2">
                {[7, 14, 30].map((days) => {
                  const value = buildFutureDateInputValue(days);
                  const selected = expiredDirectionReviewAt === value;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpiredDirectionReviewAt(value)}
                      className="rounded-[14px] px-3 py-2 text-[12px] font-bold transition-colors"
                      style={{
                        background: selected
                          ? 'linear-gradient(135deg, rgba(168,85,247,0.96) 0%, rgba(139,92,246,0.96) 100%)'
                          : resolvedTheme === 'dark'
                            ? 'rgba(30,41,59,0.9)'
                            : 'rgba(248,250,252,0.96)',
                        color: selected ? '#FFFFFF' : resolvedTheme === 'dark' ? '#E2E8F0' : '#475569',
                        border: `1px solid ${
                          selected
                            ? 'rgba(139,92,246,0.9)'
                            : resolvedTheme === 'dark'
                              ? 'rgba(148,163,184,0.22)'
                              : 'rgba(226,232,240,0.96)'
                        }`,
                      }}
                    >
                      {days}일 후
                    </button>
                  );
                })}
              </div>
              <input
                type="date"
                min={minExpiredDirectionReviewAt}
                value={expiredDirectionReviewAt}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setExpiredDirectionReviewAt(
                    nextValue && nextValue >= minExpiredDirectionReviewAt
                      ? nextValue
                      : minExpiredDirectionReviewAt
                  );
                }}
                className="w-full rounded-[16px] px-4 py-3 text-[13px] font-semibold outline-none"
                style={{
                  background: resolvedTheme === 'dark' ? 'rgba(30,41,59,0.9)' : 'rgba(248,250,252,0.96)',
                  color: resolvedTheme === 'dark' ? '#E2E8F0' : '#334155',
                  border: `1px solid ${resolvedTheme === 'dark' ? 'rgba(167,139,250,0.22)' : 'rgba(221,214,254,0.95)'}`,
                }}
              />
            </div>
          </div>
        }
        confirmLabel="회고일 연장하기"
        cancelLabel="닫기"
        confirmDisabled={
          isExpiredDirectionResolving ||
          !expiredDirectionReviewAt ||
          expiredDirectionReviewAt < minExpiredDirectionReviewAt
        }
        cancelDisabled={isExpiredDirectionResolving}
        secondaryActionLabel="이 방향 마무리하기"
        secondaryActionDisabled={isExpiredDirectionResolving}
        onSecondaryAction={() => {
          void handleFinishExpiredDirection();
        }}
        onClose={() => {
          if (isExpiredDirectionResolving) return;
          setExpiredDirectionResolution(null);
        }}
        onConfirm={() => {
          void handleExtendExpiredDirection();
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
