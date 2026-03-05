import { AppState, Direction, LogEntry, UserLevel, DailyTone, ToneType } from './types';

const STORAGE_KEY = 'quiet_path_data_v1';

const DEFAULT_DIRECTION: Direction = {
  id: 'init-dir',
  question: '이번 분기, 나는 나만의 속도를 찾고 있을까?',
  description: '서두르지 않고 깊이있게 머무르는 연습',
  createdAt: Date.now(),
  isActive: true,
};

const INITIAL_STATE: AppState = {
  currentDirection: DEFAULT_DIRECTION,
  pastDirections: [],
  logs: [],
  hasLoggedToday: false,
  hasSeenOnboarding: false,
  userLevel: 'Beginning'
};

// TONE DATA DEFINITION
const TONES: Record<ToneType, DailyTone> = {
  Fact: {
    type: 'Fact',
    label: 'Fact Check',
    header: '팩트 체크',
    question1: { title: '오늘 실제로 한 일은?', placeholder: '생각만 한 거 말고. 실제로 움직인 것만 적기.' },
    question2: { title: '지금 몸 상태는?', placeholder: '피곤함, 개운함, 배고픔... 팩트만.' },
    plan: { title: '내일 할 일 하나', placeholder: '딱 하나만. 지킬 수 있는 걸로.' }
  },
  Observe: {
    type: 'Observe',
    label: 'Observation',
    header: '관찰 기록',
    question1: { title: '오늘 본 장면 중 하나', placeholder: '하늘, 사람, 책상 위... 제3자의 눈으로.' },
    question2: { title: '오늘의 나를 한 단어로', placeholder: '평가하지 않고 이름 붙이기.' },
    plan: { title: '내일 기대되는 것', placeholder: '날씨, 점심 메뉴, 퇴근길...' }
  },
  Honest: {
    type: 'Honest',
    label: 'Inner Voice',
    header: '속마음',
    question1: { title: '솔직히, 오늘 어땠어?', placeholder: '욕 써도 됨. 아무도 안 봄.' },
    question2: { title: '진짜 하고 싶은 말', placeholder: '꾹 참았던 그 말.' },
    plan: { title: '나한테 남기는 말', placeholder: '야, 고생했다.' }
  },
  Casual: {
    type: 'Casual',
    label: 'Just Log',
    header: '그냥 끄적이기',
    question1: { title: '오늘 뭐 별일 없었음?', placeholder: '그냥 멍때렸다면 그렇다고 적기.' },
    question2: { title: '지금 기분, 흐림? 맑음?', placeholder: '☁️ / ☀️ / ☔️' },
    plan: { title: '내일은 좀 낫겠지', placeholder: '아님 말고.' }
  }
};

export const getDailyTone = (): DailyTone => {
  // Rotate tone every day based on epoch days
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const tones: ToneType[] = ['Fact', 'Observe', 'Honest', 'Casual'];
  const currentToneKey = tones[dayIndex % 4];
  return TONES[currentToneKey];
};

const calculateLevel = (logCount: number): UserLevel => {
  if (logCount >= 50) return 'Reflector'; // 성찰자
  if (logCount >= 30) return 'Maintainer'; // 유지자
  if (logCount >= 10) return 'Observer'; // 관찰자
  if (logCount >= 3) return 'Recorder'; // 기록자
  return 'Beginning';
};

export const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_STATE;
    
    const parsed = JSON.parse(saved);
    
    // Check if logged today
    const lastLog = parsed.logs && parsed.logs.length > 0 ? parsed.logs[0] : null;
    const isToday = lastLog 
      ? new Date(lastLog.timestamp).toDateString() === new Date().toDateString()
      : false;

    // Recalculate level ensuring it exists
    const level = calculateLevel(parsed.logs?.length || 0);

    return {
      ...INITIAL_STATE, // Ensure shape
      ...parsed,
      hasLoggedToday: isToday,
      userLevel: level
    };
  } catch (e) {
    console.error("Failed to load state", e);
    return INITIAL_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

export const createLogId = () => `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const createDirectionId = () => `dir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;