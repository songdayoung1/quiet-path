import { AppState, Direction, Record, UserLevel, DailyTone, ToneType } from './types';

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
  records: [],
  hasLoggedToday: false,
  hasSeenOnboarding: false,
  userLevel: 'Beginning'
};

// TONE DATA DEFINITION
const TONES: { [key in ToneType]: DailyTone } = {
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

const calculateLevel = (recordCount: number): UserLevel => {
  if (recordCount >= 50) return 'Reflector'; // 성찰자
  if (recordCount >= 30) return 'Maintainer'; // 유지자
  if (recordCount >= 10) return 'Observer'; // 관찰자
  if (recordCount >= 3) return 'Recorder'; // 기록자
  return 'Beginning';
};

export const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    let parsed = saved ? JSON.parse(saved) : null;

    // Inject dummy data if no records exist so the user can see the UI filled
    if (!parsed || !parsed.records || parsed.records.length === 0) {
        parsed = {
            ...(parsed || INITIAL_STATE),
            records: [
                {
                    id: 'dummy_1',
                    date: new Date().toISOString(),
                    timestamp: Date.now(),
                    directionQuestion: '조용한 일상을 찾아서',
                    action: '따뜻한 커피 한 잔과 함께 온전히 나에게 집중했던 시간.',
                    oneWordText: '평온',
                    moodCode: '포근',
                    imageUrl: 'https://images.unsplash.com/photo-1544716278-e513176f20b5?auto=format&fit=crop&q=80&w=600'
                },
                {
                    id: 'dummy_2',
                    date: new Date(Date.now() - 86400000).toISOString(),
                    timestamp: Date.now() - 86400000,
                    directionQuestion: '조용한 일상을 찾아서',
                    action: '오랜만에 공원에 나가 바람을 쐬었다. 초록색이 주는 위안.',
                    oneWordText: '초록빛 한숨',
                    moodCode: '잔잔',
                    imageUrl: 'https://images.unsplash.com/photo-1506744626753-1fa44df3133f?auto=format&fit=crop&q=80&w=600'
                }
            ]
        };
        saveState(parsed);
    }
    
    // Check if logged today
    const lastRecord = parsed.records && parsed.records.length > 0 ? parsed.records[0] : null;
    const isToday = lastRecord 
      ? new Date(lastRecord.timestamp).toDateString() === new Date().toDateString()
      : false;

    // Recalculate level ensuring it exists
    const level = calculateLevel(parsed.records?.length || 0);

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