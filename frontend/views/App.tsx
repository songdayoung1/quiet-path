import React, { useEffect, useState } from 'react';
import { AppState, ViewState, LogEntry, Direction } from './types';
import { loadState, saveState, createDirectionId } from './storage';
import { HomeView } from './views/HomeView';
import { RecordsView } from './views/RecordsView';
import { DirectionView } from './views/DirectionView';
import { LogEditorView } from './views/LogEditorView';
import { OnboardingView } from './views/OnboardingView';
import { CommunityView } from './views/CommunityView';
import { PastDirectionsView } from './views/PastDirectionsView';
import { Compass, Home, BookOpen, Settings, Users } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentDirection: null,
    pastDirections: [],
    logs: [],
    hasLoggedToday: false,
    hasSeenOnboarding: false,
    userLevel: 'Beginning'
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

  const handleSaveLog = (log: LogEntry, directionUpdate?: Partial<Direction>) => {
    setState(prev => {
        let currentDirection = prev.currentDirection;
        if (currentDirection && directionUpdate) {
            currentDirection = { ...currentDirection, ...directionUpdate };
        }

        return {
            ...prev,
            logs: [log, ...prev.logs],
            currentDirection,
            hasLoggedToday: true
        };
    });
    setCurrentView('NOW');
  };

  const handleUpdateLog = (updatedLog: LogEntry) => {
    setState(prev => ({
        ...prev,
        logs: prev.logs.map(log => log.id === updatedLog.id ? updatedLog : log)
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
        createdAt: Date.now(),
        isActive: true
      };
      
      return {
        ...prev,
        pastDirections: archivedDirections,
        currentDirection: newDir
      };
    });
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
        <div className="h-[100dvh] max-w-md mx-auto dream-bg relative overflow-hidden">
            <OnboardingView onComplete={handleOnboardingComplete} />
        </div>
      );
  }

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto dream-bg relative shadow-2xl shadow-mist-200/40 overflow-hidden flex flex-col">
      
      {/* Top Bar */}
      <div className="h-16 flex items-center justify-between px-8 z-10 sticky top-0 bg-transparent shrink-0">
        <div className="w-6" />
        <h1 className="text-mist-400 text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">Quiet Path</h1>
        <button 
          onClick={() => setCurrentView('SETTINGS')} 
          className="text-mist-300 hover:text-mist-500 transition-colors p-2 rounded-full hover:bg-white/40"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 px-6 overflow-y-auto no-scrollbar pt-2 scroll-smooth">
        {currentView === 'NOW' && (
          <HomeView 
            state={state} 
            onLogClick={() => setCurrentView('WRITE_LOG')}
            onHistoryClick={() => setCurrentView('PAST_DIRECTIONS')}
          />
        )}
        {currentView === 'RECORDS' && (
          <RecordsView 
            logs={state.logs} 
            currentDirection={state.currentDirection}
            pastDirections={state.pastDirections}
            onUpdateLog={handleUpdateLog} 
          />
        )}
        {currentView === 'DIRECTION' && (
          <DirectionView 
            currentDirection={state.currentDirection} 
            onUpdateDirection={handleUpdateDirection}
            onHistoryClick={() => setCurrentView('PAST_DIRECTIONS')}
          />
        )}
        {currentView === 'COMMUNITY' && (
           <CommunityView />
        )}
        {currentView === 'PAST_DIRECTIONS' && (
            <PastDirectionsView 
                pastDirections={state.pastDirections} 
                logs={state.logs}
                onBack={() => setCurrentView('DIRECTION')} 
            />
        )}
        {currentView === 'SETTINGS' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-mist-400 animate-fade-in">
             <div className="p-6 bg-white rounded-[2rem] mb-6 shadow-xl shadow-mist-100 flex flex-col items-center gap-4">
               <Settings className="w-8 h-8 text-mist-300" />
               <div className="text-center">
                   <p className="text-xs font-bold text-point-500 uppercase tracking-widest mb-1">Current State</p>
                   <p className="text-xl text-mist-600 font-medium">{state.userLevel}</p>
                   <p className="text-[10px] text-mist-300 mt-2">
                       {state.logs.length} Steps Taken
                   </p>
               </div>
             </div>
             <p className="text-xs mt-2 opacity-50">v1.4.0 Deep Violet</p>
             <button onClick={() => setCurrentView('NOW')} className="mt-8 text-sm text-point-500 font-medium">Close</button>
          </div>
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

      {/* Floating Bottom Navigation - Fixed */}
      {currentView !== 'WRITE_LOG' && (
        <div className="absolute bottom-8 left-0 w-full flex justify-center z-20 px-4 pointer-events-none">
           <nav className="pointer-events-auto h-16 px-6 bg-white/80 backdrop-blur-xl border border-white/60 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center gap-6 md:gap-8 justify-between w-full max-w-[340px]">
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