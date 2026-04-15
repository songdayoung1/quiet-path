import React from 'react';

const mascotCozy = '/assets/mascot/mascot_3d_COZY.png';
const mascotCalm = '/assets/mascot/mascot_3d_CALM.png';
const mascotExcited = '/assets/mascot/mascot_3d_EXCITED.png';
const mascotBlank = '/assets/mascot/mascot_3d_BLANK.png';
const mascotSparkle = '/assets/mascot/mascot_3d_SPARKLE.png';
const mascotHolding = '/assets/mascot/mascot_3d_HOLDING.png';

export type CharacterMood =
  | 'waiting'
  | '포근'
  | 'COZY'
  | '멍함'
  | '망함'
  | 'BLANK'
  | '반짝'
  | 'SPARKLE'
  | '잔잔'
  | 'CALM'
  | '버팀'
  | 'HOLDING'
  | '두근'
  | 'happy'
  | 'EXCITED'
  | 'neutral'
  | 'default';
export type CharacterTone = CharacterMood;

interface WaterDropCharacterProps {
  size?: number;
  mood?: CharacterMood;
  tone?: CharacterTone; // Compatibility for legacy 'tone' prop
  className?: string;
  animate?: boolean;
}

export const WaterDropCharacter: React.FC<WaterDropCharacterProps> = ({
  size = 100,
  mood,
  tone,
  className = '',
  animate = true,
}) => {
  const activeMood = mood || tone || 'waiting';

  const getMascotImage = (m: CharacterMood) => {
    switch (m) {
      case '잔잔':
      case 'CALM':
        return mascotCalm;
      case '반짝':
      case 'SPARKLE':
        return mascotSparkle;
      case '두근':
      case 'happy':
      case 'EXCITED':
        return mascotExcited;
      case '멍함':
      case '망함':
      case 'BLANK':
        return mascotBlank;
      case '버팀':
      case 'HOLDING':
        return mascotHolding;
      case '포근':
      case 'COZY':
      case 'waiting':
      case 'neutral':
      default:
        return mascotCozy;
    }
  };

  const mascotSrc = getMascotImage(activeMood);

  const animationStyle = animate ? {
    animation: (activeMood === 'waiting' || activeMood === 'neutral' || activeMood === 'default')
      ? 'float 3s ease-in-out infinite' 
      : 'breathe 4s ease-in-out infinite'
  } : {};

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
          }
        `}
      </style>
      
      <img
        src={mascotSrc}
        alt="Mascot"
        className="w-full h-full object-contain relative z-10"
        style={{ 
          ...animationStyle,
          maxWidth: '100%',
          maxHeight: '100%',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))'
        }}
      />
    </div>
  );
};

export const MiniDrop: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div style={{ width: size, height: size }} className={className}>
      <img src={mascotCozy} className="w-full h-full object-contain opacity-80" alt="drop" />
    </div>
  );
};
