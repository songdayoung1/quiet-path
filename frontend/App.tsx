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
import { Settings } from 'lucide-react';

/* ── Custom Nav Icons ───────────────────────────────────────────────────── */
const NavIcon: React.FC<{ view: ViewState; active: boolean }> = ({ view, active }) => {
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
import { SettingsView } from './views/SettingsView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentDirection: null,
    pastDirections: [],
    records: [],
    hasLoggedToday: false,
    hasSeenOnboarding: false,
    userLevel: 'Beginning',
    isLoggedIn: false
  });

  const [currentView, setCurrentView] = useState<ViewState>('ONBOARDING');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    
    // Logic to determine initial view
    if (!loaded.hasSeenOnboarding) {
        setCurrentView('ONBOARDING');
    } else {
        setCurrentView('NOW');
    }
    
    setIsLoaded(true);
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

  const handleUpdateDirection = (updates: Partial<Direction>) => {
    setState(prev => {
      // Archive current direction if exists
      const archivedDirections = prev.currentDirection 
        ? [{ ...prev.currentDirection, endedAt: Date.now(), isActive: false }, ...prev.pastDirections]
        : prev.pastDirections;

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
        pastDirections: archivedDirections,
        currentDirection: newDir
      };
    });
  };

  const handleLogin = () => {
    // Mock Login Logic
    setState(prev => ({ ...prev, isLoggedIn: true }));
    if (currentView === 'ONBOARDING') {
      setCurrentView('NOW');
    }
  };

  const handleLogout = () => {
    // Mock Logout Logic
    if (window.confirm("로그아웃 하시겠습니까? 로컬 데이터는 유지되지만, 동기화가 중지됩니다.")) {
         setState(prev => ({ ...prev, isLoggedIn: false }));
         setCurrentView('ONBOARDING');
    }
  };

  const NavItem = ({ view, label }: { view: ViewState; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => setCurrentView(view)}
        className="flex flex-col items-center justify-center gap-1.5 transition-all duration-500 ease-out group flex-1"
      >
        <div
          className={[
            'w-16 h-16 rounded-[22px] flex items-center justify-center transition-all duration-500 ease-out',
            isActive
              ? 'bg-gradient-to-br from-[#9F75FF] to-[#8B5CF6] shadow-[0_8px_20px_rgba(139,92,246,0.3)] -translate-y-2 scale-110'
              : 'bg-transparent hover:bg-white/40',
          ].join(' ')}
        >
          <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-105 group-active:scale-95'}`}>
            <NavIcon view={view} active={isActive} />
          </div>
        </div>
        <span
          className={`text-[10px] font-bold tracking-tight transition-all duration-500 ${
            isActive ? 'text-[#8B5CF6] opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-40'
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  if (!isLoaded) return null;

  // Onboarding Screen Overlay
  if (currentView === 'ONBOARDING') {
      return (
        <div className="min-h-screen max-w-md mx-auto dream-bg relative overflow-hidden">
            <OnboardingView 
                onComplete={handleOnboardingComplete} 
                onLogin={handleLogin}
            />
        </div>
      );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto dream-bg relative shadow-2xl shadow-mist-200/40 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      
      {/* Top Bar */}
      <div className="h-16 flex items-center justify-between px-8 z-10 sticky top-0 bg-transparent">
        <div className="w-6" />
        <h1 className="text-mist-400 text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">Quiet Path</h1>
        <button 
          onClick={() => setCurrentView('SETTINGS')} 
          className="text-mist-300 hover:text-mist-500 transition-colors p-2 rounded-full hover:bg-white/40"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-6 pt-2 pb-32">
        {currentView === 'NOW' && (
          <HomeView 
            state={state} 
            onLogClick={() => setCurrentView('WRITE_LOG')}
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
            onLogClick={() => setCurrentView('WRITE_LOG')}
          />
        )}
        {currentView === 'DIRECTION' && (
          <DirectionView 
            currentDirection={state.currentDirection} 
            records={state.records}
            onUpdateDirection={handleUpdateDirection}
            onHistoryClick={() => setCurrentView('PAST_DIRECTIONS')}
          />
        )}
        {currentView === 'COMMUNITY' && (
           <CommunityView records={state.records} />
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
              onLogin={handleLogin}
              onLogout={handleLogout}
           />
        )}
      </main>

      {/* Modal View for Logging */}
      {currentView === 'WRITE_LOG' && (
        <LogEditorView 
          state={state} 
          onSave={handleSaveLog} 
          onCancel={() => setCurrentView('NOW')} 
        />
      )}

      {/* Floating Bottom Navigation */}
      {currentView !== 'WRITE_LOG' && (
        <div className="fixed bottom-10 left-0 w-full flex justify-center z-20 px-6 pointer-events-none">
           <nav className="h-24 px-4 bg-white/90 backdrop-blur-2xl border border-white/80 rounded-[40px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] flex items-center justify-between w-full max-w-[360px] pointer-events-auto">
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
