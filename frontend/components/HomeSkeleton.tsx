import React from 'react';
import { Card } from './UI';
import { getThemePalette, useResolvedTheme } from '../theme';

// ── Primitive ────────────────────────────────────────────────────────────────

interface SkeletonBlockProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = '', style }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: palette.border, ...style }}
    />
  );
};

// ── TodaysCard skeleton ───────────────────────────────────────────────────────

export const TodaysCardSkeleton: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  return (
    <Card
      className="backdrop-blur-md shadow-sm !p-6"
      style={{ background: palette.cardBg, borderColor: palette.border }}
    >
      <div className="flex items-center gap-5">
        {/* character placeholder */}
        <div
          className="shrink-0 w-[90px] h-[90px] rounded-full animate-pulse"
          style={{ background: palette.border }}
        />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonBlock className="h-3 w-20 rounded-full" />
          <SkeletonBlock className="h-5 w-36 rounded-lg" />
          <SkeletonBlock className="h-5 w-28 rounded-lg" />
          <SkeletonBlock className="h-3 w-32 rounded-full mt-1" />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonBlock className="h-11 w-full rounded-2xl" />
      </div>
    </Card>
  );
};

// ── CurrentPathStrip skeleton ─────────────────────────────────────────────────

export const CurrentPathStripSkeleton: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  return (
    <Card
      className="!rounded-[2rem] !p-5 backdrop-blur-md shadow-sm"
      style={{ background: palette.cardBg, borderColor: palette.border }}
    >
      <div className="flex items-center gap-5">
        {/* category icon area */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <SkeletonBlock className="h-3 w-10 rounded-full" />
          <SkeletonBlock className="w-12 h-12 !rounded-full" />
        </div>
        {/* text area */}
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-28 rounded-lg" />
          <SkeletonBlock className="h-3 w-40 rounded-full" />
        </div>
        {/* stat area */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <SkeletonBlock className="h-7 w-12 rounded-lg" />
          <SkeletonBlock className="h-3 w-14 rounded-full" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </Card>
  );
};

// ── ProgressBand skeleton ─────────────────────────────────────────────────────

export const ProgressBandSkeleton: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  return (
    <div className="flex flex-col gap-3">
      {/* heatmap card */}
      <Card
        className="backdrop-blur-md shadow-sm !p-5"
        style={{ background: palette.cardBg, borderColor: palette.border }}
      >
        {/* heatmap grid — 3 rows of cells */}
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-1.5">
              {Array.from({ length: 21 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 aspect-square rounded-sm animate-pulse"
                  style={{
                    background: palette.border,
                    animationDelay: `${(row * 21 + i) * 18}ms`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-end gap-1 mt-3 pt-3"
          style={{ borderTop: `1px solid ${palette.divider}` }}
        >
          <SkeletonBlock className="h-3 w-20 rounded-full" />
        </div>
      </Card>

      {/* monthly stats card */}
      <Card
        className="backdrop-blur-md shadow-sm !p-5"
        style={{ background: palette.cardBg, borderColor: palette.border }}
      >
        <div className="flex items-center justify-between mb-4">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-3 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-3 flex flex-col items-center gap-2"
              style={{ background: palette.cardBgSoft, border: `1px solid ${palette.border}` }}
            >
              <SkeletonBlock className="h-2.5 w-12 rounded-full" />
              <SkeletonBlock className="h-6 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ── MemoryPreviewStrip skeleton ───────────────────────────────────────────────

export const MemoryPreviewStripSkeleton: React.FC = () => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  return (
    <Card
      className="shadow-sm !p-5"
      style={{ background: palette.cardBgMuted, borderColor: palette.border }}
    >
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonBlock className="h-3 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl animate-pulse"
            style={{
              background: palette.border,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </Card>
  );
};

// ── Hero header skeleton ──────────────────────────────────────────────────────

export const HeroSkeleton: React.FC = () => (
  <div className="mt-2 flex items-start justify-between px-2">
    <div className="flex flex-col gap-2 pt-1">
      <SkeletonBlock className="h-5 w-24 rounded-full" style={{ marginBottom: 4 }} />
      <SkeletonBlock className="h-7 w-48 rounded-lg" />
      <SkeletonBlock className="h-4 w-36 rounded-full mt-0.5" />
    </div>
  </div>
);
