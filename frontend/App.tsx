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
import { Compass, Home, BookOpen, Settings, Users } from 'lucide-react';
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

  // Modern Floating Nav Item - Updated to use Point Color
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => setCurrentView(view)}
        className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 ${isActive ? 'bg-point-500 text-white shadow-lg shadow-point-400/40 translate-y-[-8px]' : 'text-mist-400 hover:bg-white hover:text-mist-600'}`}
      >
        <Icon size={isActive ? 20 : 22} strokeWidth={isActive ? 2 : 1.5} />
        {isActive && (
           <span className="absolute -bottom-6 text-[10px] font-medium text-mist-500 tracking-wide animate-fade-in whitespace-nowrap">
             {label}
           </span>
        )}
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
        <div className="fixed bottom-8 left-0 w-full flex justify-center z-20 px-4 pointer-events-none">
           <nav className="h-16 px-6 bg-white/80 backdrop-blur-xl border border-white/60 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center gap-6 md:gap-8 justify-between w-full max-w-[340px] pointer-events-auto">
            <NavItem view="NOW" icon={Home} label="Now" />
            <NavItem view="RECORDS" icon={BookOpen} label="Journal" />
            <NavItem view="COMMUNITY" icon={Users} label="Flow" />
            <NavItem view="DIRECTION" icon={Compass} label="Path" />
          </nav>
        </div>
      )}
    </div>
  );
};

export default App;
