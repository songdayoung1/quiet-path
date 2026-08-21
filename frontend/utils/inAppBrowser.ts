export type KakaoInAppPlatform = 'android' | 'ios' | 'other';

export interface KakaoInAppBrowserInfo {
  isKakaoInAppBrowser: boolean;
  platform: KakaoInAppPlatform;
}

export const detectKakaoInAppBrowser = (userAgent: string): KakaoInAppBrowserInfo => {
  const isKakaoInAppBrowser = /KAKAOTALK/i.test(userAgent);

  if (/Android/i.test(userAgent)) {
    return { isKakaoInAppBrowser, platform: 'android' };
  }

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return { isKakaoInAppBrowser, platform: 'ios' };
  }

  return { isKakaoInAppBrowser, platform: 'other' };
};

