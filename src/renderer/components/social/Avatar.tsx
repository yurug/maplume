/**
 * Avatar - Displays user avatar based on preset
 *
 * Renders an SVG-based avatar for the given preset, or falls back to initials
 */

import React from 'react';
import { AVATAR_PRESETS, type AvatarPreset } from '@maplume/shared';

interface AvatarProps {
  preset: string | null;
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Size mappings
const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

// Color palettes for each avatar type
const avatarColors: Record<string, { bg: string; fg: string; accent: string }> = {
  'writer-1': { bg: '#E8D5B7', fg: '#5D4037', accent: '#8D6E63' },
  'writer-2': { bg: '#C5CAE9', fg: '#303F9F', accent: '#5C6BC0' },
  'writer-3': { bg: '#FFCCBC', fg: '#BF360C', accent: '#FF5722' },
  'writer-4': { bg: '#B2DFDB', fg: '#00695C', accent: '#26A69A' },
  'quill-1': { bg: '#FFF9C4', fg: '#F57F17', accent: '#FFB300' },
  'quill-2': { bg: '#F3E5F5', fg: '#6A1B9A', accent: '#AB47BC' },
  'quill-3': { bg: '#E1F5FE', fg: '#0277BD', accent: '#29B6F6' },
  'quill-4': { bg: '#FCE4EC', fg: '#AD1457', accent: '#EC407A' },
  'book-1': { bg: '#D7CCC8', fg: '#4E342E', accent: '#795548' },
  'book-2': { bg: '#DCEDC8', fg: '#33691E', accent: '#7CB342' },
  'book-3': { bg: '#CFD8DC', fg: '#37474F', accent: '#607D8B' },
  'book-4': { bg: '#FFE0B2', fg: '#E65100', accent: '#FF9800' },
  'cat-1': { bg: '#FFF3E0', fg: '#E65100', accent: '#FF8A65' },
  'cat-2': { bg: '#E0E0E0', fg: '#424242', accent: '#757575' },
  'owl-1': { bg: '#D1C4E9', fg: '#4527A0', accent: '#7E57C2' },
  'owl-2': { bg: '#FFECB3', fg: '#FF6F00', accent: '#FFB300' },
};

// Generate initials from username
function getInitials(username: string): string {
  return username.charAt(0).toUpperCase();
}

// SVG components for each avatar type
function WriterIcon({ colors }: { colors: typeof avatarColors[string] }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill={colors.bg} />
      {/* Head */}
      <circle cx="50" cy="35" r="18" fill={colors.fg} />
      {/* Body */}
      <path d="M25 85 Q25 55 50 55 Q75 55 75 85" fill={colors.fg} />
      {/* Pen in hand */}
      <rect x="60" y="50" width="4" height="25" rx="1" fill={colors.accent} transform="rotate(-30 60 50)" />
    </svg>
  );
}

function QuillIcon({ colors }: { colors: typeof avatarColors[string] }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill={colors.bg} />
      {/* Quill feather */}
      <path
        d="M25 75 Q35 55 45 35 Q50 20 55 35 Q55 55 50 65 Q45 75 25 75"
        fill={colors.fg}
        stroke={colors.accent}
        strokeWidth="2"
      />
      {/* Quill tip */}
      <path d="M25 75 L30 85 L35 75" fill={colors.accent} />
      {/* Feather details */}
      <path d="M40 40 Q50 35 50 50" fill="none" stroke={colors.accent} strokeWidth="1.5" />
      <path d="M42 50 Q50 45 52 55" fill="none" stroke={colors.accent} strokeWidth="1.5" />
    </svg>
  );
}

function BookIcon({ colors }: { colors: typeof avatarColors[string] }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill={colors.bg} />
      {/* Book cover */}
      <rect x="25" y="25" width="50" height="50" rx="3" fill={colors.fg} />
      {/* Book spine */}
      <rect x="25" y="25" width="8" height="50" rx="2" fill={colors.accent} />
      {/* Pages */}
      <rect x="35" y="30" width="35" height="40" fill="#FAFAFA" rx="1" />
      {/* Text lines */}
      <rect x="40" y="38" width="25" height="3" fill={colors.accent} opacity="0.5" />
      <rect x="40" y="46" width="20" height="3" fill={colors.accent} opacity="0.5" />
      <rect x="40" y="54" width="25" height="3" fill={colors.accent} opacity="0.5" />
    </svg>
  );
}

function CatIcon({ colors }: { colors: typeof avatarColors[string] }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill={colors.bg} />
      {/* Cat face */}
      <circle cx="50" cy="55" r="28" fill={colors.fg} />
      {/* Ears */}
      <path d="M25 40 L32 25 L42 40" fill={colors.fg} />
      <path d="M75 40 L68 25 L58 40" fill={colors.fg} />
      {/* Inner ears */}
      <path d="M28 38 L32 30 L38 38" fill={colors.accent} />
      <path d="M72 38 L68 30 L62 38" fill={colors.accent} />
      {/* Eyes */}
      <ellipse cx="40" cy="52" rx="5" ry="6" fill={colors.bg} />
      <ellipse cx="60" cy="52" rx="5" ry="6" fill={colors.bg} />
      <circle cx="40" cy="52" r="3" fill="#333" />
      <circle cx="60" cy="52" r="3" fill="#333" />
      {/* Nose */}
      <path d="M47 62 L50 66 L53 62" fill={colors.accent} />
      {/* Mouth */}
      <path d="M50 66 Q45 72 40 68" fill="none" stroke={colors.accent} strokeWidth="1.5" />
      <path d="M50 66 Q55 72 60 68" fill="none" stroke={colors.accent} strokeWidth="1.5" />
    </svg>
  );
}

function OwlIcon({ colors }: { colors: typeof avatarColors[string] }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill={colors.bg} />
      {/* Body */}
      <ellipse cx="50" cy="58" r="30" ry="32" fill={colors.fg} />
      {/* Eye circles */}
      <circle cx="38" cy="48" r="14" fill={colors.bg} />
      <circle cx="62" cy="48" r="14" fill={colors.bg} />
      {/* Eyes */}
      <circle cx="38" cy="48" r="8" fill="#333" />
      <circle cx="62" cy="48" r="8" fill="#333" />
      <circle cx="36" cy="46" r="3" fill="#FFF" />
      <circle cx="60" cy="46" r="3" fill="#FFF" />
      {/* Beak */}
      <path d="M45 55 L50 68 L55 55" fill={colors.accent} />
      {/* Ear tufts */}
      <path d="M28 35 L32 20 L40 35" fill={colors.fg} />
      <path d="M72 35 L68 20 L60 35" fill={colors.fg} />
      {/* Chest feathers */}
      <ellipse cx="50" cy="72" rx="15" ry="10" fill={colors.bg} opacity="0.5" />
    </svg>
  );
}

// Get the icon component for a preset
function getAvatarIcon(preset: AvatarPreset, colors: typeof avatarColors[string]) {
  if (preset.startsWith('writer-')) {
    return <WriterIcon colors={colors} />;
  }
  if (preset.startsWith('quill-')) {
    return <QuillIcon colors={colors} />;
  }
  if (preset.startsWith('book-')) {
    return <BookIcon colors={colors} />;
  }
  if (preset.startsWith('cat-')) {
    return <CatIcon colors={colors} />;
  }
  if (preset.startsWith('owl-')) {
    return <OwlIcon colors={colors} />;
  }
  return null;
}

export function Avatar({ preset, username, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  // Check if preset is valid
  const isValidPreset = preset && AVATAR_PRESETS.includes(preset as AvatarPreset);

  if (isValidPreset && preset) {
    const colors = avatarColors[preset] || avatarColors['writer-1'];
    const icon = getAvatarIcon(preset as AvatarPreset, colors);

    if (icon) {
      return (
        <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
          {icon}
        </div>
      );
    }
  }

  // Fallback to initials
  const initials = getInitials(username);
  const colors = avatarColors['writer-1'];

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-medium flex-shrink-0 ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {initials}
    </div>
  );
}

// Export for use in AvatarPicker
export { avatarColors, AVATAR_PRESETS };
export type { AvatarPreset };
