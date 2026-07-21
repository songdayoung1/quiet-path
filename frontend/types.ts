export interface Record {
  id: string;
  pathId?: string;
  date: string; // ISO String
  timestamp: number;
  directionQuestion: string; // The question active at the time
  action: string; // 오늘의 기록
  oneWordText?: string; // 오늘의 한 단어
  tomorrowText?: string; // 내일의 메모
  reflection?: string; // Legacy
  plan?: string; // Legacy
  isHidden?: boolean; // Soft delete
  isPinned?: boolean; // "Important Moment"
  moodCode?: string; // Mood Sticker Code
  imageUrl?: string; // Image Attachment
  imagePositionX?: number;
  imagePositionY?: number;
  imageScale?: number;
  isShared?: boolean; // Shared to Community
}

export interface RecordDetail extends Record {
  tags?: string[];
}

export interface RecordSummary {
  id: string;
  date: string;
  moodCode?: string;
  oneWordText?: string;
  action: string;
  imageUrl?: string;
}

export type RecordCardDisplayMode = 'poster' | 'diary';

export interface MonthlyReportResponse {
  year: number;
  month: number;
  records: RecordSummary[];
  topMoods: string[];
  retentionRate?: number;
}

export interface PathActiveResponse {
  currentPath: Direction;
  recordsCount: number;
  startDate: string;
}

export interface PathSummaryResponse {
  path: Direction;
  aiSummary: string;
  records: RecordSummary[];
}

export interface Direction {
  id: string;
  question: string; // e.g., "Am I moving towards peace?"
  description: string; // Subtle context
  categoryId?: string;
  categoryLabel?: string;
  createdAt: number;
  endedAt?: number; // When this direction was archived
  reviewAt?: number; // Time Anchor: When to review this flow
  isActive: boolean;
  expired?: boolean;
  aiSummary?: string; // The "Future Retrieval" summary
}

export type ViewState = 'ONBOARDING' | 'ACCOUNT_CONNECT' | 'OAUTH_CALLBACK' | 'NICKNAME_SETUP' | 'NOW' | 'RECORDS' | 'DIRECTION' | 'COMMUNITY' | 'WRITE_LOG' | 'SETTINGS' | 'PAST_DIRECTIONS';

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

export type OnboardingStatus = 'NEW' | 'EXISTING';

export interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  userId?: string | null;
  onboardingStatus?: OnboardingStatus;
}

export interface MeResponse {
  id: string;
  name: string;
  onboardingStatus: OnboardingStatus;
}

export interface AppState {
  currentDirection: Direction | null;
  pastDirections: Direction[];
  records: Record[]; // Renamed from logs
  hasLoggedToday: boolean;
  hasSeenOnboarding: boolean;
  userLevel: UserLevel;
  auth: AuthState;
}
