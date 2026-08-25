import React from 'react';
import { getThemePalette, useResolvedTheme } from '../theme';

interface MainScreenHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  actionBelowOnNarrow?: boolean;
  bottomSpacing?: boolean;
}

export const MainScreenHeader: React.FC<MainScreenHeaderProps> = ({
  title,
  description,
  eyebrow,
  action,
  actionBelowOnNarrow = false,
  bottomSpacing = true,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const responsiveLayout = actionBelowOnNarrow
    ? 'flex-col gap-4 min-[390px]:flex-row min-[390px]:gap-3'
    : 'flex-row gap-3';

  return (
    <header
      className={`relative z-10 mt-2 px-2 animate-fade-in ${bottomSpacing ? 'mb-6' : ''}`}
    >
      <div className={`flex items-start justify-between ${responsiveLayout}`}>
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="mb-3 flex items-center">{eyebrow}</div>}
          <h1
            className="break-keep text-[22px] font-semibold leading-[1.2] tracking-tight sm:text-2xl"
            style={{ color: palette.strongText }}
          >
            {title}
          </h1>
          {description && (
            <div
              className="mt-2 break-keep text-[13px] font-normal leading-relaxed sm:text-sm"
              style={{ color: palette.mutedText }}
            >
              {description}
            </div>
          )}
        </div>
        {action && (
          <div
            className={`shrink-0 ${
              actionBelowOnNarrow
                ? 'self-end min-[390px]:mt-0 min-[390px]:self-start'
                : 'self-start'
            }`}
          >
            {action}
          </div>
        )}
      </div>
    </header>
  );
};
