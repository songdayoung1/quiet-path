import React from 'react';

// Transparent PNG Mascot Image Paths (Using dist/assets as requested)
const mascotPurple = '/dist/assets/mascot/mascot_3d_purple.png';
const mascotCalm = '/dist/assets/mascot/mascot_3d_calm.png';
const mascotHappy = '/dist/assets/mascot/mascot_3d_happy.png';
const mascotGray = '/dist/assets/mascot/mascot_3d_gray.png';
const mascotSparkle = '/dist/assets/mascot/mascot_3d_sparkle.png';
const mascotMint = '/dist/assets/mascot/mascot_3d_mint.png';
const mascotBlank = '/dist/assets/mascot/mascot_3d_gray.png';

export type CharacterMood = 'waiting' | '포근' | '멍함' | '망함' | '반짝' | '잔잔' | '버팀' | '두근' | 'happy' | 'neutral' | 'default';
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
  // Use mood if provided, otherwise fallback to tone
  const activeMood = mood || tone || 'waiting';
  // Map moods to transparent PNG images in public folder
  const getMascotImage = (m: CharacterMood) => {
    switch (m) {
      case '잔잔':
        return mascotCalm;
      case '반짝':
        return mascotSparkle;
      case '두근':
      case 'happy':
        return mascotHappy;
      case '멍함':
      case '망함':
        return mascotBlank;
      case '버팀':
        return mascotMint;
      case '포근':
      case 'waiting':
      case 'neutral':
      default:
        return mascotPurple;
    }
  };

  const mascotSrc = getMascotImage(activeMood);

  // Animation Styles
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
      
      {/* 3D Mascot Image (Transparent PNG from public/assets/mascot) */}
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

/** Mood-tinted mini drop for decorative use */
export const MiniDrop: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <div style={{ width: size, height: size }} className={className}>
      <img src={mascotPurple} className="w-full h-full object-contain opacity-80" alt="drop" />
    </div>
  );
};
