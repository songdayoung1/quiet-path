import React, { useEffect, useState } from 'react';
import { AppState, ViewState, Record, Direction } from './types';
import { loadState, saveState, createDirectionId } from './storage';
import { HomeView } from './views/HomeView';
import { RecordsView } from './views/RecordsView';
import { DirectionView } from './views/DirectionView';
import { LogEditorView } from './views/LogEditorView';
import { OnboardingView } from './views/OnboardingView';
import { CommunityView } from './views/CommunityView';
import { PastDirectionsView } from './views/PastDirectionsView';
import { SettingsView } from './views/SettingsView';
import { OAuthCallbackView } from './views/OAuthCallbackView';
import { AccountConnectView } from './views/AccountConnectView';
import { NicknameSetupView } from './views/NicknameSetupView';
import { authApi } from './api/authApi';
import { Settings, Compass } from 'lucide-react';

const OAUTH_PENDING_CODE_KEY = 'qp.oauth.pending.code';
const OAUTH_PENDING_ERROR_KEY = 'qp.oauth.pending.error';

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
        <path d="M4 6h7c1 0 2 1 2 2v11c0-1-1-2-2-2H4V6z" stroke={stroke} {...sp} />
        <path d="M20 6h-7c-1 0-2 1-2 2v11c0-1 1-2 2-2h7V6z" stroke={stroke} {...sp} />
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

const appFlowABgStyle: React.CSSProperties = {
  backgroundColor: '#F8FAFC',
  backgroundImage:
    'radial-gradient(circle at -30% -25%, rgba(194,209,255,0.55) 0%, rgba(194,209,255,0) 62%), radial-gradient(circle at 130% 120%, rgba(178,223,219,0.55) 0%, rgba(178,223,219,0) 62%), linear-gradient(180deg, #ECEFFE 0%, #E2EEEC 100%)',
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentDirection: null,
    pastDirections: [],
    records: [],
    hasLoggedToday: false,
    hasSeenOnboarding: false,
    userLevel: 'Beginning',
    auth: { isLoggedIn: false, token: null }
  });

  const [currentView, setCurrentView] = useState<ViewState | 'INITIALIZING'>('INITIALIZING');
  const [isLoaded, setIsLoaded] = useState(false);
  const [authCodeParam, setAuthCodeParam] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
        const loaded = loadState();
        if (!loaded.auth) loaded.auth = { isLoggedIn: false, token: null };
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
        } else if (loaded.auth.token && !loaded.auth.isLoggedIn) {
            try {
                const me = await authApi.getMe(loaded.auth.token);
                setState(prev => ({
                    ...prev,
                    auth: { isLoggedIn: true, token: loaded.auth.token, onboardingStatus: me.onboardingStatus }
                }));
                if (me.onboardingStatus === 'NEW') {
                   setCurrentView('NICKNAME_SETUP'); 
                } else {
                   setCurrentView('NOW');
                }
            } catch (err) {
                setState(prev => ({ ...prev, auth: { isLoggedIn: false, token: null } }));
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

  const handleOnboardingComplete = (initialDirection: Direction) => {
      setState(prev => ({ 
          ...prev, 
          currentDirection: initialDirection,
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

  const handleStartDirection = (updates: Partial<Direction>) => {
    setState(prev => {
      if (prev.currentDirection) {
        return prev;
      }

      const newDir: Direction = {
        id: createDirectionId(),
        question: updates.question || '',
        description: updates.description || '',
        categoryId: updates.categoryId,
        categoryLabel: updates.categoryLabel,
        createdAt: Date.now(),
        reviewAt: updates.reviewAt,
        isActive: true
      };
      
      return {
        ...prev,
        currentDirection: newDir
      };
    });
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
      window.alert('기록하려면 먼저 방향을 시작해 주세요.');
      setCurrentView('DIRECTION');
      return;
    }
    setCurrentView('WRITE_LOG');
  };

  const handleLoginSuccess = (status: 'NEW' | 'EXISTING', token: string) => {
      window.sessionStorage.removeItem(OAUTH_PENDING_CODE_KEY);
      window.sessionStorage.removeItem(OAUTH_PENDING_ERROR_KEY);
      setState(prev => ({ 
         ...prev, 
         auth: { isLoggedIn: true, token, onboardingStatus: status }
      }));
      
      if (status === 'NEW') {
          setCurrentView('NICKNAME_SETUP');
      } else {
          // Existing Users go to HOME. If they've never seen Onboarding, we assume they somehow bypassed it and it is now true.
          setState(prev => ({ ...prev, hasSeenOnboarding: true }));
          setCurrentView('NOW');
      }
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까? 로컬 데이터는 유지되지만, 동기화가 중지됩니다.")) {
         const token = state.auth.token;
         if (token) {
           authApi.logout(token).catch(() => undefined);
         }
         setState(prev => ({ ...prev, auth: { isLoggedIn: false, token: null } }));
         setCurrentView('ONBOARDING');
    }
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
          <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
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
      <div className="flex h-screen w-full max-w-[430px] mx-auto items-center justify-center" style={appFlowABgStyle}>
         <Compass size={32} className="text-point-500 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
    );
  }

  /* ── 2. Fullscreen Auth Related Views ── */
  if (currentView === 'ACCOUNT_CONNECT') {
      return (
          <div className="min-h-screen max-w-[430px] mx-auto relative" style={appFlowABgStyle}>
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
        <div className="min-h-screen max-w-[430px] mx-auto relative overflow-hidden" style={appFlowABgStyle}>
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
          <div className="min-h-screen max-w-[430px] mx-auto relative overflow-hidden" style={appFlowABgStyle}>
             <NicknameSetupView 
                onComplete={async (nickname) => {
                   const token = state.auth.token;
                   if (token) {
                      try {
                        const me = await authApi.updateNickname(token, nickname);
                        setState(prev => ({
                          ...prev,
                          auth: {
                            ...prev.auth,
                            onboardingStatus: me.onboardingStatus
                          },
                          hasSeenOnboarding: true
                        }));
                      } catch (err: any) {
                        window.alert(err?.message || '닉네임 저장에 실패했습니다.');
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
        <div className="min-h-screen max-w-[430px] mx-auto relative overflow-hidden" style={appFlowABgStyle}>
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
      className="min-h-screen max-w-[430px] mx-auto relative shadow-2xl shadow-mist-200/40 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={appFlowABgStyle}
    >
      
      {/* Header Overlay (Gradient Blur) */}
      <div 
        className="sticky top-0 h-20 -mb-20 z-20 pointer-events-none transition-opacity duration-500"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          backgroundColor: 'rgba(255, 255, 255, 0.4)'
        }}
      />

      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-8 z-30 sticky top-0 bg-transparent">
        <div className="w-6" />
        <h1 className="text-mist-400 text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">Quiet Path</h1>
        <button 
          onClick={() => setCurrentView('SETTINGS')} 
          className="text-mist-400 hover:text-purple-500 transition-all p-2 rounded-full hover:bg-white/40 active:scale-95"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-6 pt-2 pb-32">
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
              records={state.records} 
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
              onClose={() => setCurrentView('NOW')}
              onLogin={() => setCurrentView('ACCOUNT_CONNECT')}
              onLogout={handleLogout}
           />
        )}
      </main>

      {/* Modal View for Logging */}
      {currentView === 'WRITE_LOG' && (
        <LogEditorView 
          state={state} 
          onSave={handleSaveLog} 
          onStartDirection={() => setCurrentView('DIRECTION')}
          onCancel={() => setCurrentView('NOW')} 
        />
      )}

      {/* Floating Bottom Navigation */}
      {currentView !== 'WRITE_LOG' && currentView !== 'SETTINGS' && (
        <div className="fixed bottom-6 left-0 w-full flex justify-center z-40 px-6 pointer-events-none">
           <nav className="h-[64px] px-2 bg-white/94 backdrop-blur-2xl border border-white/80 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex items-center justify-between w-full max-w-[340px] pointer-events-auto">
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
