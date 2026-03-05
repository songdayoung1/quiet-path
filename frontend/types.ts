export interface LogEntry {
  id: string;
  date: string; // ISO String
  timestamp: number;
  directionQuestion: string; // The question active at the time
  reflection: string; // The "sogam" (one line feeling)
  action: string; // What was actually done
  plan?: string; // Optional plan summary
  isHidden?: boolean; // Soft delete
  isPinned?: boolean; // "Important Moment"
  mood?: string; // Emoji
  imageUrl?: string; // Mock attachment
  isShared?: boolean; // Shared to Community
}

export interface Direction {
  id: string;
  question: string; // e.g., "Am I moving towards peace?"
  description: string; // Subtle context
  createdAt: number;
  endedAt?: number; // When this direction was archived
  reviewAt?: number; // Time Anchor: When to review this flow
  isActive: boolean;
  aiSummary?: string; // The "Future Retrieval" summary
}

export type ViewState = 'ONBOARDING' | 'NOW' | 'RECORDS' | 'DIRECTION' | 'COMMUNITY' | 'WRITE_LOG' | 'SETTINGS' | 'PAST_DIRECTIONS';

export type UserLevel = 'Beginning' | 'Recorder' | 'Observer' | 'Maintainer' | 'Reflector';

export type ToneType = 'Fact' | 'Observe' | 'Honest' | 'Casual';

export interface DailyTone {
  type: ToneType;
  label: string;
  header: string;
  question1: { title: string; placeholder: string };
  question2: { title: string; placeholder: string };
  plan: { title: string; placeholder: string };
}

export interface AppState {
  currentDirection: Direction | null;
  pastDirections: Direction[];
  logs: LogEntry[];
  hasLoggedToday: boolean;
  hasSeenOnboarding: boolean;
  userLevel: UserLevel;
  isLoggedIn?: boolean;
}