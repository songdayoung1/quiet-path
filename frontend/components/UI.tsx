import React, { useRef, useEffect } from 'react';
import { TreeDeciduous, TreePine, Shrub, Mountain, Cloud, Star, Sparkles, Flower, Tent } from 'lucide-react';
import { MOOD_STICKERS } from '../constants';

// Enhanced Card with Depth, Gradient, and optional Traces
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  breathe?: boolean;
  withTraces?: boolean;
  style?: React.CSSProperties;
}> = ({ children, className = '', onClick, breathe = false, withTraces = false, style }) => {
  return (
    <div
      onClick={onClick}
      style={style}
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
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-lavender-50/20 pointer-events-none opacity-50" />
      
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
}> = ({ onClick, children, disabled, variant = 'primary', className = '' }) => {
  
  const baseStyle = "w-full rounded-2xl py-4 px-6 text-sm font-medium tracking-wide transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.98]";
  
  const variants = {
    primary: "bg-point-500 text-white shadow-lg shadow-point-400/30 hover:bg-point-600 hover:shadow-point-400/50 disabled:opacity-50 disabled:cursor-not-allowed border border-point-400/20",
    secondary: "bg-white/80 backdrop-blur-md text-mist-500 border border-mist-200 hover:bg-white disabled:opacity-50 shadow-sm",
    text: "bg-transparent text-mist-400 hover:text-mist-600"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// Minimal text input
export const SoftInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <input
      {...props}
      className={`w-full bg-surface-subtle/50 border border-transparent rounded-2xl p-4 text-mist-600 placeholder-mist-300 focus:bg-white focus:ring-1 focus:ring-point-300 outline-none transition-all ${props.className}`}
    />
  );
};

// Auto-expanding text area
export const AutoTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
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
      className={`w-full bg-surface-subtle/50 border border-transparent rounded-2xl p-4 text-mist-600 placeholder-mist-300 focus:bg-white focus:ring-1 focus:ring-point-300 outline-none transition-all resize-none overflow-hidden min-h-[80px] leading-relaxed ${props.className}`}
    />
  );
};

export const SoftTextArea = AutoTextArea;

export const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-8 px-2 animate-fade-in relative z-10 text-center">
    <h1 className="text-2xl font-semibold text-mist-600 tracking-tight leading-relaxed">{title}</h1>
    {subtitle && <p className="text-mist-400 text-sm mt-2 font-normal leading-loose opacity-80">{subtitle}</p>}
  </div>
);

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
        px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300
        border-2 border-white
        ${sticker.color}
        ${selected ? 'scale-110 ring-2 ring-white/50 ring-offset-1 opacity-100 rotate-2 origin-bottom-right z-10' : 'opacity-90 hover:opacity-100 hover:rotate-2 hover:scale-105 origin-bottom-right'}
        ${!onClick ? 'cursor-default' : ''}
        ${className}
      `}
      style={{
          boxShadow: selected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.5)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255,255,255,0.5)'
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

// Streak Heatmap: 30-day record visualization (GitHub-style)
export const StreakHeatmap: React.FC<{
  records: { timestamp: number; isHidden?: boolean; moodCode?: string }[];
  className?: string;
}> = ({ records, className = '' }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 35-day grid (5 weeks) ending today
  const days: { date: Date; hasRecord: boolean; moodCode?: string; isToday: boolean; isFuture: boolean }[] = [];

  // Calculate start: go back to fill complete weeks
  const todayDay = today.getDay(); // 0=Sun
  const totalCells = 35; // 5 weeks
  const daysBack = totalCells - 1 - (6 - todayDay); // align so today falls on correct weekday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalCells - 1));
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const activeRecords = records.filter(r => !r.isHidden);
  const recordDateMap = new Map<string, string>();
  activeRecords.forEach(r => {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (r.moodCode) recordDateMap.set(key, r.moodCode);
    else recordDateMap.set(key, '__recorded__');
  });

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    days.push({
      date: d,
      hasRecord: recordDateMap.has(key),
      moodCode: recordDateMap.get(key) === '__recorded__' ? undefined : recordDateMap.get(key),
      isToday: key === todayKey,
      isFuture: d > today,
    });
  }

  // Calculate current streak
  let currentStreak = 0;
  const checkDate = new Date(today);
  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (recordDateMap.has(key)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Count total recorded days in last 30 days
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const last30Records = days.filter(d => d.hasRecord && d.date >= thirtyDaysAgo && !d.isFuture).length;

  const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

  // Mood to color mapping
  const getMoodColor = (moodCode?: string, hasRecord?: boolean) => {
    if (!hasRecord) return '';
    if (!moodCode) return 'bg-point-300';
    const map: Record<string, string> = {
      '포근': 'bg-point-400',
      '멍함': 'bg-mist-300',
      '반짝': 'bg-lavender-400',
      '잔잔': 'bg-blue-300',
      '버팀': 'bg-green-400',
      '두근': 'bg-rose-400',
    };
    return map[moodCode] || 'bg-point-300';
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-point-500">{currentStreak}</span>
            <span className="text-xs font-medium text-mist-400">일 연속</span>
          </div>
          <div className="w-px h-5 bg-mist-200" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-mist-600">{last30Records}</span>
            <span className="text-[10px] text-mist-300">/30일</span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-mist-300 uppercase tracking-widest">Streak</span>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-[5px] mb-1.5">
        {weekLabels.map(label => (
          <div key={label} className="text-center text-[9px] font-medium text-mist-300 tracking-wide">
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-7 gap-[5px]">
        {days.map((day, i) => {
          const color = getMoodColor(day.moodCode, day.hasRecord);
          return (
            <div
              key={i}
              className={`
                aspect-square rounded-lg transition-all duration-300
                ${day.isFuture
                  ? 'bg-transparent'
                  : day.hasRecord
                    ? `${color} shadow-sm`
                    : 'bg-mist-100/60'
                }
                ${day.isToday ? 'ring-2 ring-point-300 ring-offset-1' : ''}
              `}
              title={`${day.date.getMonth() + 1}/${day.date.getDate()}`}
            >
              {day.isToday && !day.hasRecord && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-point-400 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mood legend */}
      <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-mist-100/60" />
          <span className="text-[9px] text-mist-300">없음</span>
        </div>
        {[
          { code: '포근', color: 'bg-point-400' },
          { code: '반짝', color: 'bg-lavender-400' },
          { code: '잔잔', color: 'bg-blue-300' },
          { code: '버팀', color: 'bg-green-400' },
          { code: '두근', color: 'bg-rose-400' },
        ].map(m => (
          <div key={m.code} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${m.color}`} />
            <span className="text-[9px] text-mist-400">{m.code}</span>
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
import { WaterDropCharacter } from './WaterDropCharacter';

export const WaterDropOverlay: React.FC<{ leaving?: boolean }> = ({
  leaving = false,
}) => {
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
      className={`water-drop-overlay${leaving ? ' leaving' : ''} absolute inset-0 z-50 flex flex-col items-center justify-center`}
      style={{ background: 'rgba(245,243,255,0.92)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
    >
      {/* Character + ripples */}
      <div className="relative flex items-center justify-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="ripple-ring absolute rounded-full border border-point-300/50"
            style={{ width: '80px', height: '80px', animationDelay: `${i * 0.18}s` }}
          />
        ))}

        {/* Happy character instead of plain emoji */}
        <div className="drop-icon relative z-10">
          <WaterDropCharacter size={86} mood="happy" animate={false} />
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

      <p className="success-text mt-8 text-base font-semibold text-point-600 tracking-wide">
        오늘의 장면이 담겼어요
      </p>
      <p className="success-text mt-1 text-xs text-mist-400" style={{ animationDelay: '0.65s' }}>
        하루를 잘 기록했어요 ✨
      </p>
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
  const cat = CATEGORIES.find(c => c.id === categoryId);

  const sizeMap = {
    sm: { outer: 'w-9 h-9', iconSize: 12, radius: 'rounded-xl' },
    md: { outer: 'w-12 h-12', iconSize: 16, radius: 'rounded-2xl' },
    lg: { outer: 'w-16 h-16', iconSize: 22, radius: 'rounded-3xl' },
  };
  const { outer, iconSize, radius } = sizeMap[size];

  if (!cat) {
    return (
      <div
        className={`${outer} ${radius} flex items-center justify-center shadow-sm shrink-0 ${className}`}
        style={{ background: 'linear-gradient(135deg, #E4E7EB, #CBD2D9)' }}
      >
        <Briefcase size={iconSize} color="#9AA5B1" strokeWidth={1.8} />
      </div>
    );
  }

  const IconComponent = CATEGORY_ICON_MAP[cat.icon] ?? Briefcase;

  return (
    <div
      className={`${outer} ${radius} flex items-center justify-center shadow-sm shrink-0 ${className}`}
      style={{ background: `linear-gradient(135deg, ${cat.gradientFrom}, ${cat.gradientTo})` }}
    >
      <IconComponent size={iconSize} color={cat.accent} strokeWidth={2} />
    </div>
  );
};
