const APP_GUIDE_COMPLETED_KEY = 'qp.app-guide.completed.v1';
const RECORDS_TAB_GUIDE_PENDING_KEY = 'qp.records-tab-guide.pending.v1';

export const hasCompletedAppGuide = () => {
  try {
    return localStorage.getItem(APP_GUIDE_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markAppGuideCompleted = () => {
  try {
    localStorage.setItem(APP_GUIDE_COMPLETED_KEY, 'true');
  } catch {
    // 저장소를 사용할 수 없는 환경에서도 가이드 종료는 허용합니다.
  }
};

export const hasPendingRecordsTabGuide = () => {
  try {
    return localStorage.getItem(RECORDS_TAB_GUIDE_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
};

export const queueRecordsTabGuide = () => {
  try {
    localStorage.setItem(RECORDS_TAB_GUIDE_PENDING_KEY, 'true');
  } catch {
    // 저장소를 사용할 수 없는 환경에서는 현재 세션의 안내 상태만 사용합니다.
  }
};

export const completeRecordsTabGuide = () => {
  try {
    localStorage.removeItem(RECORDS_TAB_GUIDE_PENDING_KEY);
  } catch {
    // 저장소를 사용할 수 없는 환경에서도 안내 종료는 허용합니다.
  }
};
