import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AppModal } from './AppModal';
import { detectKakaoInAppBrowser, type KakaoInAppPlatform } from '../utils/inAppBrowser';

type CopyState = 'idle' | 'copied' | 'error';

const getDetectionUserAgent = () => {
  if (import.meta.env.DEV) {
    const previewPlatform = new URLSearchParams(window.location.search).get('kakaoInAppPreview');
    if (previewPlatform === 'android') return 'Mozilla/5.0 (Linux; Android 14) KAKAOTALK/10.8.3 (INAPP)';
    if (previewPlatform === 'ios') return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) KAKAOTALK/10.8.2 (INAPP)';
  }

  return window.navigator.userAgent;
};

const copyWithFallback = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
};

const getGuide = (platform: KakaoInAppPlatform) => {
  if (platform === 'android') {
    return {
      browserName: '기본 브라우저',
      steps: ['카카오톡 화면 오른쪽 위의 메뉴(⋮)를 눌러주세요.', '‘다른 브라우저로 열기’를 선택해 주세요.'],
    };
  }

  if (platform === 'ios') {
    return {
      browserName: 'Safari',
      steps: ['카카오톡 화면 아래쪽의 공유 또는 더보기 메뉴를 눌러주세요.', '‘Safari로 열기’를 선택해 주세요.'],
    };
  }

  return {
    browserName: '외부 브라우저',
    steps: ['카카오톡의 공유 또는 더보기 메뉴를 열어주세요.', '‘다른 브라우저로 열기’를 선택해 주세요.'],
  };
};

export const KakaoInAppBrowserNotice: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<KakaoInAppPlatform>('other');
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    const info = detectKakaoInAppBrowser(getDetectionUserAgent());
    setPlatform(info.platform);
    setOpen(info.isKakaoInAppBrowser);
  }, []);

  const handleCopy = async () => {
    const currentUrl = window.location.href;

    try {
      if (window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(currentUrl);
      } else if (!copyWithFallback(currentUrl)) {
        throw new Error('copy failed');
      }
      setCopyState('copied');
    } catch {
      setCopyState(copyWithFallback(currentUrl) ? 'copied' : 'error');
    }
  };

  const handleConfirm = () => {
    if (copyState === 'copied') {
      setOpen(false);
      return;
    }

    void handleCopy();
  };

  const guide = getGuide(platform);

  return (
    <AppModal
      open={open}
      icon={<ExternalLink size={22} />}
      title={`${guide.browserName}에서 열어주세요`}
      description={
        <div className="text-left break-keep">
          <p className="text-center">
            카카오톡 안에서는 일부 기능이 제한될 수 있어요.
            <br />
            아래 순서로 외부 브라우저에서 열어주세요.
          </p>

          <ol
            className="mt-4 space-y-2.5 rounded-[16px] border px-4 py-3.5"
            style={{ borderColor: 'rgba(167,139,250,0.24)' }}
          >
            {guide.steps.map((step, index) => (
              <li key={step} className="flex gap-2.5 leading-relaxed">
                <span className="shrink-0 font-bold text-point-500">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <p className="mt-4 text-center text-[11px] leading-relaxed" aria-live="polite">
            {copyState === 'copied' && '링크를 복사했어요. 외부 브라우저 주소창에 붙여 넣어주세요.'}
            {copyState === 'error' && '자동 복사가 되지 않았어요. 카카오톡 메뉴에서 외부 브라우저로 열어주세요.'}
            {copyState === 'idle' && '메뉴를 찾기 어렵다면 현재 링크를 복사해 이용할 수 있어요.'}
          </p>
        </div>
      }
      confirmLabel={copyState === 'copied' ? '복사 완료' : '현재 링크 복사'}
      cancelLabel="여기서 계속 보기"
      onConfirm={handleConfirm}
      onClose={() => setOpen(false)}
    />
  );
};
