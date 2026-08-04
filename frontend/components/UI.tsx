import React, { useRef, useEffect } from 'react';
import { TreeDeciduous, TreePine, Shrub, Mountain, Cloud, Star, Sparkles, Flower, Tent } from 'lucide-react';
import { MOOD_STICKERS } from '../constants';
import { KPI_LABELS } from '../kpiLabels';
import { getThemePalette, useResolvedTheme } from '../theme';
import {
  buildRecordDateMap,
  toLocalDateKey,
} from '../utils/heatmap';

// Enhanced Card with Depth, Gradient, and optional Traces
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  breathe?: boolean;
  withTraces?: boolean;
  withSurfaceOverlay?: boolean;
  style?: React.CSSProperties;
}> = ({
  children,
  className = '',
  onClick,
  breathe = false,
  withTraces = false,
  withSurfaceOverlay = true,
  style,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div
      onClick={onClick}
      style={{
        background: palette.cardBg,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: palette.border,
        boxShadow: palette.shadow,
        ...style,
      }}
      className={`
        glass-panel rounded-[2rem] p-6 transition-all duration-300 ease-out 
        relative overflow-hidden
        hover:shadow-[0_8px_30px_rgba(139,92,246,0.08)] 
        hover:scale-[1.015] active:scale-[0.99]
        ${breathe ? 'animate-breathe' : ''}
        ${className}
      `}
    >
      {/* 2. Card Layer Depth: Subtle Gradient Overlay */}
      {withSurfaceOverlay && (
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              theme === 'dark'
                ? 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 42%, rgba(129,140,248,0.08) 100%)'
                : 'linear-gradient(to bottom right, rgba(255,255,255,0.60) 0%, transparent 52%, rgba(237,233,254,0.22) 100%)',
          }}
        />
      )}
      
      {/* 3. Abstract Background Traces */}
      {withTraces && (
        <svg className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="none">
           <path d="M0,150 Q100,50 200,150 T400,150" fill="none" stroke="currentColor" strokeWidth="2" className="text-point-500" />
           <circle cx="350" cy="50" r="120" fill="currentColor" className="text-mist-500" />
           <path d="M-50,250 Q150,200 300,300" fill="none" stroke="currentColor" strokeWidth="2" className="text-point-300" />
        </svg>
      )}

      {/* Content Layer */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

// Updated Button with Point Color
export const SoftButton: React.FC<{ 
  onClick?: () => void; 
  children: React.ReactNode; 
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
  className?: string;
  style?: React.CSSProperties;
}> = ({ onClick, children, disabled, variant = 'primary', className = '', style }) => {
  const theme = useResolvedTheme();
  
  const baseStyle = "w-full rounded-2xl py-4 px-6 text-sm font-medium tracking-wide transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.98]";
  
  const variants = {
    primary: "bg-point-500 text-white shadow-lg shadow-point-400/30 hover:bg-point-600 hover:shadow-point-400/50 disabled:opacity-50 disabled:cursor-not-allowed border border-point-400/20",
    secondary:
      theme === 'dark'
        ? "bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 shadow-sm"
        : "bg-white/80 backdrop-blur-md text-mist-500 border border-mist-200 hover:bg-white disabled:opacity-50 shadow-sm",
    text: theme === 'dark' ? "bg-transparent text-slate-400 hover:text-slate-200" : "bg-transparent text-mist-400 hover:text-mist-600"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
};

// Minimal text input
export const SoftInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <input
      {...props}
      className={`w-full rounded-2xl p-4 outline-none transition-all ${props.className}`}
      style={{
        background: palette.cardBgSoft,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: palette.border,
        color: palette.strongText,
        ...(props.style ?? {}),
      }}
    />
  );
};

// Auto-expanding text area
export const AutoTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={props.rows || 1}
      onChange={(e) => {
        adjustHeight();
        if (props.onChange) props.onChange(e);
      }}
      className={`w-full rounded-2xl p-4 outline-none transition-all resize-none overflow-hidden min-h-[80px] leading-relaxed ${props.className}`}
      style={{
        background: palette.cardBgSoft,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: palette.border,
        color: palette.strongText,
        ...(props.style ?? {}),
      }}
    />
  );
};

export const SoftTextArea = AutoTextArea;

export const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  return (
    <div className="mb-8 px-2 animate-fade-in relative z-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight leading-relaxed" style={{ color: palette.strongText }}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm mt-2 font-normal leading-loose opacity-90" style={{ color: palette.mutedText }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

// Mood Sticker Component for v1.5
export const MoodSticker: React.FC<{
  code: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ code, selected = false, onClick, className = '' }) => {
  const sticker = MOOD_STICKERS.find(s => s.code === code) || { label: code, color: 'bg-mist-100 text-mist-500 border-mist-200' };
  
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        inline-flex shrink-0 items-center justify-center whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide leading-none transition-all duration-300
        border-[1.5px]
        ${sticker.color}
        ${selected ? 'scale-105 ring-2 ring-violet-300/35 ring-offset-1 opacity-100 z-10' : 'opacity-95 hover:opacity-100 hover:scale-105'}
        ${!onClick ? 'cursor-default' : ''}
        ${className}
      `}
      style={{
          boxShadow: selected ? '0 4px 10px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.4)' : '0 1px 2px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.35)'
      }}
    >
      {sticker.label}
    </button>
  );
};

// Quote Styled Title - 5. Typography Rhythm (Wider Tracking)
export const QuoteHeader: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  return (
    <div className={`relative py-4 text-center mx-auto max-w-xs ${className}`}>
      <h2 className="text-xl md:text-2xl text-mist-600 font-medium leading-relaxed relative z-10 px-4 tracking-wider">
        {text}
      </h2>
      <span className="absolute -top-1 left-2 text-4xl text-point-300/40 font-serif leading-none select-none z-0">
        “
      </span>
      <span className="absolute -bottom-2 right-2 text-4xl text-point-300/40 font-serif leading-none select-none z-0">
        ”
      </span>
    </div>
  );
};

// Water Compass: Replacing Moon Phase
// Visualizes time flow as water level.
export const WaterCompass: React.FC<{ 
  startDate: number; 
  reviewDate?: number; 
  className?: string;
}> = ({ startDate, reviewDate, className = '' }) => {
  const now = Date.now();
  let progressPercentage = 50; // Default for Open Path
  let label = "Open Path";

  if (reviewDate) {
    const total = reviewDate - startDate;
    const elapsed = now - startDate;
    // Calculate progress (0 to 1), clamp between 0.1 and 1
    const rawProgress = Math.min(Math.max(elapsed / total, 0.0), 1);
    
    // Convert to percentage for water level height (10% min to 100%)
    progressPercentage = 10 + (rawProgress * 90);

    if (rawProgress < 0.2) label = "Flowing";
    else if (rawProgress < 0.8) label = "Deepening";
    else if (rawProgress >= 1) label = "Full Tide";
    else label = "Rising";
  }

  return (
    <div className={`flex flex-col items-center justify-center py-4 ${className}`}>
       <style>{`
          @keyframes wave {
            0% { transform: translateX(0); }
            50% { transform: translateX(-25%); }
            100% { transform: translateX(-50%); }
          }
          .water-wave {
            animation: wave 8s linear infinite;
          }
       `}</style>

       {/* Container Circle */}
       <div className="relative w-40 h-40 mb-3 rounded-full overflow-hidden border border-white/60 shadow-[inset_0_4px_20px_rgba(0,0,0,0.05)] bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-sm z-10">
         
         {/* Glass Reflection */}
         <div className="absolute top-4 left-8 w-8 h-4 bg-white/40 rounded-full blur-[2px] transform -rotate-12 z-20"></div>
         <div className="absolute bottom-6 right-8 w-4 h-2 bg-white/20 rounded-full blur-[1px] transform -rotate-12 z-20"></div>

         {/* The Water */}
         <div 
            className="absolute bottom-0 left-0 w-[200%] h-full transition-all duration-[2000ms] ease-in-out"
            style={{ 
                transform: `translateY(${100 - progressPercentage}%)`,
            }}
         >
             {/* Back Wave (Slower, lighter) */}
             <div className="absolute top-[-10px] left-0 w-full h-[120%] bg-point-200/40 water-wave" style={{ animationDuration: '10s', animationDirection: 'reverse' }}>
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[40px] block absolute top-[-38px] left-0">
                    <path d="M0,0 C150,50 350,0 600,20 C850,40 1050,0 1200,20 L1200,120 L0,120 Z" fill="currentColor" className="text-point-200/40" />
                </svg>
             </div>

             {/* Front Wave (Faster, darker) */}
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-point-400/80 to-point-300/60 water-wave">
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[40px] block absolute top-[-38px] left-0">
                    <path d="M0,30 C150,0 350,60 600,30 C850,0 1050,40 1200,10 L1200,120 L0,120 Z" fill="currentColor" className="text-point-300/60" />
                </svg>
             </div>
         </div>
       </div>

       {/* Status Text - No Numbers */}
       <p className="text-mist-400 text-xs font-medium tracking-[0.2em] uppercase opacity-80 mt-4">
         {label}
       </p>
    </div>
  );
};

// Forest Object for "My Forest" View
export const ForestObject: React.FC<{ index: number; type: string; isLocked: boolean }> = ({ index, type, isLocked }) => {
  // Deterministic random generation
  const seed = index * 137.508; 
  
  // Position X: 5% to 95%
  const x = (Math.abs(Math.sin(seed * 1.1)) * 90) + 5;
  
  // Position Y (Depth): 2% (front/bottom) to 45% (mid/back) of the container
  // We bias towards the bottom to fill the "ground"
  const rawY = Math.abs(Math.cos(seed * 0.7));
  const y = (rawY * 45) + 2; 

  // Scale: Closer (lower y) -> Bigger. Further (higher y) -> Smaller
  // Range: ~0.6 (far) to ~1.4 (near)
  const scale = 1.4 - (rawY * 0.8);
  
  // Z-Index: Closer objects overlap ones behind them
  const zIndex = 100 - Math.floor(y);

  // Define Icon Sets based on context
  const getIconData = (text: string) => {
      const t = text.toLowerCase();
      
      // Animations
      const sway = 'animate-sway origin-bottom';
      const float = 'animate-float';
      const twinkle = 'animate-twinkle';
      const staticAnim = '';

      if (t.includes('취업') || t.includes('이직') || t.includes('job') || t.includes('work')) {
          // Sturdy, growth
          return [
              { Icon: TreeDeciduous, anim: sway, color: 'text-point-500' },
              { Icon: TreePine, anim: sway, color: 'text-point-600' },
              { Icon: Mountain, anim: staticAnim, color: 'text-mist-300' }
          ]; 
      }
      if (t.includes('공부') || t.includes('자격증') || t.includes('study')) {
          // Structure, climb
          return [
              { Icon: Mountain, anim: staticAnim, color: 'text-mist-400' },
              { Icon: TreePine, anim: sway, color: 'text-point-400' },
              { Icon: Cloud, anim: float, color: 'text-white' } // Clouds for high altitude
          ]; 
      }
      if (t.includes('운동') || t.includes('건강') || t.includes('workout')) {
          // Vitality
          return [
              { Icon: TreeDeciduous, anim: sway, color: 'text-mint-400' },
              { Icon: Shrub, anim: staticAnim, color: 'text-mint-300' },
              { Icon: Mountain, anim: staticAnim, color: 'text-mist-300' }
          ]; 
      }
      if (t.includes('취미') || t.includes('사이드') || t.includes('art')) {
          // Sparkle, creative
          return [
              { Icon: Sparkles, anim: twinkle, color: 'text-point-300' },
              { Icon: Flower, anim: sway, color: 'text-lavender-400' },
              { Icon: Star, anim: twinkle, color: 'text-point-200' }
          ]; 
      }
      if (t.includes('생활') || t.includes('루틴') || t.includes('life')) {
          // Daily comfort
          return [
              { Icon: Shrub, anim: staticAnim, color: 'text-point-300' },
              { Icon: Flower, anim: sway, color: 'text-lavender-400' },
              { Icon: Tent, anim: staticAnim, color: 'text-mist-400' }
          ]; 
      }
      
      // Default Mix
      return [
          { Icon: TreeDeciduous, anim: sway, color: 'text-point-400' },
          { Icon: TreePine, anim: sway, color: 'text-point-500' },
          { Icon: Shrub, anim: staticAnim, color: 'text-mist-400' },
          { Icon: Cloud, anim: float, color: 'text-white' }
      ]; 
  };

  const variants = getIconData(type);
  const selected = variants[index % variants.length];
  const { Icon, anim, color } = selected;
  
  // Locked items are greyed out
  const finalColor = isLocked ? 'text-mist-300' : color;
  const finalAnim = isLocked ? '' : anim; // Locked items don't move
  
  // Random small rotation for static variety
  const initialRot = (Math.sin(seed) * 5).toFixed(1); 

  return (
    <div 
      className={`absolute flex flex-col items-center cursor-pointer group transition-all duration-700 hover:scale-125`}
      style={{ 
        left: `${x}%`, 
        bottom: `${y}%`, 
        zIndex: zIndex,
        transform: `scale(${scale}) rotate(${initialRot}deg)`,
        opacity: isLocked ? 0.6 : 1,
        filter: isLocked ? 'blur(0.5px)' : 'none' // Slight blur for locked
      }}
    >
      <Icon 
        strokeWidth={1.5} 
        className={`${finalColor} ${finalAnim} drop-shadow-sm transition-colors duration-300`} 
        size={32} 
      />
      
      {/* Tooltip on Hover */}
      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[8px] whitespace-nowrap shadow-sm text-mist-500 pointer-events-none z-50">
          Step {index + 1}
      </div>
    </div>
  );
};

const MOOD_HEATMAP_COLOR: Record<string, string> = {
  '포근': 'bg-point-300',
  '멍함': 'bg-slate-400',
  '반짝': 'bg-amber-300',
  '잔잔': 'bg-blue-200',
  '버팀': 'bg-green-300',
  '두근': 'bg-rose-300',
};

const HEATMAP_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// Streak Heatmap: current-month activity grid (GitHub-inspired)
export const StreakHeatmap: React.FC<{
  records: { timestamp: number; isHidden?: boolean; moodCode?: string }[];
  className?: string;
}> = ({ records, className = '' }) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const recordDateMap = buildRecordDateMap(records);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDay = today.getDate();
  const emptyCellColor = theme === 'dark' ? 'rgba(51,65,85,0.92)' : 'rgba(226,232,240,0.9)';

  type DayCell = null | { day: number; hasRecord: boolean; moodCode?: string; isToday: boolean; isFuture: boolean };
  const cells: DayCell[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const key = toLocalDateKey(date);
    const isFuture = d > todayDay;
    const rawMood = recordDateMap.get(key);
    cells.push({
      day: d,
      hasRecord: !isFuture && recordDateMap.has(key),
      moodCode: rawMood !== '__recorded__' ? rawMood : undefined,
      isToday: d === todayDay,
      isFuture,
    });
  }

  const recordedDays = cells.filter((c): c is NonNullable<DayCell> => c !== null && (c as NonNullable<DayCell>).hasRecord).length;
  const currentMonthRate = daysInMonth > 0 ? Math.round((recordedDays / daysInMonth) * 100) : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4 xl:mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl xl:text-xl font-bold text-point-500">{currentMonthRate}%</span>
          <span className="text-xs font-medium" style={{ color: palette.mutedText }}>{KPI_LABELS.recent21Rate}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: palette.strongText }}>{recordedDays}</span>
          <span className="text-[10px]" style={{ color: palette.faintText }}>/ {daysInMonth}{KPI_LABELS.recent21CountUnit}</span>
          <div className="w-px h-4 mx-0.5" style={{ background: palette.divider }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: palette.faintText }}>{KPI_LABELS.recent21Tag}</span>
        </div>
      </div>

      <p className="text-[10px] font-medium mb-3 xl:mb-2" style={{ color: palette.faintText }}>
        {KPI_LABELS.recent21Panel}
      </p>

      {/* Day-of-week header (always Sun→Sat) */}
      <div className="mx-auto grid grid-cols-7 gap-[5px] mb-1.5 xl:max-w-[300px] xl:gap-1">
        {HEATMAP_WEEKDAYS.map((label, i) => (
          <div key={label} className="text-center">
            <span
              className="text-[9px] font-semibold"
              style={{ color: i === 0 ? '#F87171' : i === 6 ? '#60A5FA' : palette.faintText }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="mx-auto grid grid-cols-7 gap-[5px] xl:max-w-[300px] xl:gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`gap-${i}`} className="aspect-square" />;
          const colorClass = cell.hasRecord
            ? (MOOD_HEATMAP_COLOR[cell.moodCode || ''] || 'bg-point-300')
            : '';
          return (
            <div
              key={cell.day}
              className={[
                'aspect-square rounded-lg transition-all duration-300',
                cell.hasRecord ? `${colorClass} shadow-sm` : '',
                cell.isToday ? 'ring-2 ring-point-300 ring-offset-1' : '',
              ].join(' ')}
              style={{
                backgroundColor: cell.hasRecord ? undefined : emptyCellColor,
                opacity: cell.isFuture ? 0.28 : 1,
              }}
              title={`${currentMonth + 1}/${cell.day}`}
            >
              {cell.isToday && !cell.hasRecord && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-point-400 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mood legend */}
      <div className="flex items-center justify-center gap-3 xl:gap-2.5 mt-4 xl:mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: emptyCellColor }} />
          <span className="text-[9px]" style={{ color: palette.faintText }}>없음</span>
        </div>
        {[
          { code: '포근', color: 'bg-point-300' },
          { code: '반짝', color: 'bg-amber-300' },
          { code: '잔잔', color: 'bg-blue-200' },
          { code: '버팀', color: 'bg-green-300' },
          { code: '두근', color: 'bg-rose-300' },
          { code: '멍함', color: 'bg-slate-400' },
        ].map(m => (
          <div key={m.code} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${m.color}`} />
            <span className="text-[9px]" style={{ color: palette.mutedText }}>{m.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Abstract Visual Trace for List View
export const VisualTrace: React.FC<{ index: number }> = ({ index }) => {
  const shapes = ['rounded-full', 'rounded-sm', 'rounded-tl-xl rounded-br-xl', 'rounded-[40%]'];
  const colors = ['bg-point-200', 'bg-lavender-200', 'bg-mist-200', 'bg-point-100'];
  const sizes = ['w-2 h-2', 'w-1.5 h-1.5', 'w-3 h-3', 'w-2 h-4'];

  const shapeClass = shapes[index % shapes.length];
  const colorClass = colors[(index * 3) % colors.length];
  const sizeClass = sizes[(index * 7) % sizes.length];
  const rotation = (index * 45) % 180;

  return (
    <div 
      className={`${shapeClass} ${colorClass} ${sizeClass} opacity-60 absolute -right-3 top-6`}
      style={{ transform: `rotate(${rotation}deg)` }}
    />
  );
};
// ── Water Drop Micro-interaction Overlay ──
import { WaterDropCharacter, CharacterMood } from './WaterDropCharacter';

export const WaterDropOverlay: React.FC<{ 
  leaving?: boolean;
  mood?: CharacterMood;
  title?: string;
  subtitle?: string;
}> = ({
  leaving = false,
  mood = 'happy',
  title = "오늘의 기록이 담겼어요",
  subtitle = "하루를 잘 기록했어요 ✨"
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);
  const droplets = [
    { dx: '-28px', dy: '-36px', delay: '0.28s', size: 8 },
    { dx: '32px',  dy: '-30px', delay: '0.32s', size: 6 },
    { dx: '40px',  dy: '20px',  delay: '0.30s', size: 8 },
    { dx: '22px',  dy: '38px',  delay: '0.35s', size: 4 },
    { dx: '-38px', dy: '24px',  delay: '0.26s', size: 6 },
    { dx: '-20px', dy: '40px',  delay: '0.33s', size: 4 },
    { dx: '14px',  dy: '-42px', delay: '0.29s', size: 4 },
    { dx: '-42px', dy: '-14px', delay: '0.31s', size: 6 },
  ];

  return (
    <div
      className={`water-drop-overlay${leaving ? ' leaving' : ''} absolute inset-0 z-[80]`}
      style={{
        background: theme === 'dark' ? 'rgba(15,23,42,0.90)' : 'rgba(245,243,255,0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <div className="h-full w-full flex flex-col items-center justify-center px-6">
        {/* Character + ripples */}
        <div className="relative flex items-center justify-center">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="ripple-ring absolute rounded-full border border-point-300/50"
              style={{ width: '80px', height: '80px', animationDelay: `${i * 0.18}s` }}
            />
          ))}

          {/* Mascot dynamic mood */}
          <div className="drop-icon relative z-10">
            <WaterDropCharacter size={86} mood={mood} animate={false} />
          </div>

          {droplets.map((d, i) => (
            <span
              key={i}
              className="droplet absolute rounded-full bg-point-300"
              style={{
                '--dx': d.dx,
                '--dy': d.dy,
                animationDelay: d.delay,
                width: `${d.size}px`,
                height: `${d.size}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        <p className="success-text mt-8 text-base font-semibold tracking-wide text-center" style={{ color: theme === 'dark' ? '#C4B5FD' : '#7C3AED' }}>
          {title}
        </p>
        <p className="success-text mt-1 text-xs text-center" style={{ animationDelay: '0.65s', color: palette.mutedText }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// CategoryIcon: iOS 앱 아이콘 스타일의 카테고리 뱃지
// ─────────────────────────────────────────────
import { Briefcase, BookOpen as BookOpenIcon, Dumbbell, Palette, Award } from 'lucide-react';
import { CATEGORIES } from '../constants';

const CATEGORY_ICON_MAP: Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Briefcase,
  BookOpen: BookOpenIcon,
  Dumbbell,
  Palette,
  Award,
};

export const CategoryIcon: React.FC<{
  categoryId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ categoryId, size = 'md', className = '' }) => {
  const theme = useResolvedTheme();
  const cat = CATEGORIES.find(c => c.id === categoryId);

  const sizeMap = {
    sm: { outer: 'w-9 h-9', iconSize: 15, radius: 'rounded-xl' },
    md: { outer: 'w-12 h-12', iconSize: 20, radius: 'rounded-2xl' },
    lg: { outer: 'w-16 h-16', iconSize: 28, radius: 'rounded-3xl' },
  };
  const { outer, iconSize, radius } = sizeMap[size];
  const iconColor = theme === 'dark' ? '#EDE9FE' : '#6D5ACF';
  const iconBackground = theme === 'dark'
    ? 'linear-gradient(145deg, rgba(109,40,217,0.38), rgba(67,56,202,0.44))'
    : 'linear-gradient(145deg, rgba(233,213,255,0.92), rgba(199,210,254,0.92))';
  const iconBorder = theme === 'dark'
    ? 'rgba(196,181,253,0.24)'
    : 'rgba(255,255,255,0.78)';

  if (!cat) {
    return (
      <div
        className={`${outer} ${radius} flex items-center justify-center border shrink-0 ${className}`}
        style={{
          background: iconBackground,
          borderColor: iconBorder,
          boxShadow: '0 10px 22px -14px rgba(109,90,207,0.42)',
        }}
      >
        <Briefcase size={iconSize} color={iconColor} strokeWidth={1.8} />
      </div>
    );
  }

  const IconComponent = CATEGORY_ICON_MAP[cat.icon] ?? Briefcase;

  return (
    <div
      className={`${outer} ${radius} flex items-center justify-center border shrink-0 ${className}`}
      style={{
        background: iconBackground,
        borderColor: iconBorder,
        boxShadow: '0 10px 22px -14px rgba(109,90,207,0.42)',
      }}
    >
      <IconComponent size={iconSize} color={iconColor} strokeWidth={1.8} />
    </div>
  );
};
