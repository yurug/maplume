/**
 * Avatar - Unified avatar display using DiceBear
 *
 * Supports:
 * - DiceBear generated avatars (new default) - 20 beautiful styles
 * - Uploaded images
 * - Legacy presets (converted to DiceBear)
 */

import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import * as collection from '@dicebear/collection';
import type { AvatarData, DiceBearConfig, DiceBearStyle } from '@maplume/shared';

interface AvatarProps {
  avatarData?: AvatarData | null;
  preset?: string | null; // Legacy support
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Size mappings
const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

// Map style names to DiceBear style modules
const STYLE_MAP: Record<DiceBearStyle, any> = {
  'adventurer': collection.adventurer,
  'adventurer-neutral': collection.adventurerNeutral,
  'avataaars': collection.avataaars,
  'big-ears': collection.bigEars,
  'big-ears-neutral': collection.bigEarsNeutral,
  'lorelei': collection.lorelei,
  'lorelei-neutral': collection.loreleiNeutral,
  'micah': collection.micah,
  'open-peeps': collection.openPeeps,
  'personas': collection.personas,
  'pixel-art': collection.pixelArt,
  'pixel-art-neutral': collection.pixelArtNeutral,
  'thumbs': collection.thumbs,
  'bottts': collection.bottts,
  'fun-emoji': collection.funEmoji,
  'shapes': collection.shapes,
};

// Generate DiceBear avatar SVG
export function generateDiceBearAvatar(config: DiceBearConfig): string {
  const styleModule = STYLE_MAP[config.style];
  if (!styleModule) {
    // Fallback to adventurer if style not found
    return generateDiceBearAvatar({ ...config, style: 'adventurer' });
  }

  const options: Record<string, any> = {
    seed: config.seed,
    size: 128,
    radius: 0, // Force no radius to prevent SVG masks
  };

  // Add background color if specified (not for all styles)
  if (config.backgroundColor && config.backgroundColor !== 'transparent') {
    options.backgroundColor = [config.backgroundColor.replace('#', '')];
  }

  // Style-specific adjustments
  // Some styles need specific options to render properly
  switch (config.style) {
    case 'bottts':
    case 'bottts-neutral':
      // Bottts renders better with specific colors
      options.colors = ['amber', 'blue', 'blueGrey', 'brown', 'cyan', 'deepOrange', 'deepPurple', 'green', 'grey', 'indigo', 'lightBlue', 'lightGreen', 'lime', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow'];
      break;
    case 'shapes':
      // Shapes needs colors
      options.colors = ['0284c7', '0d9488', '059669', 'ca8a04', 'dc2626', 'db2777', '9333ea', '4f46e5'];
      break;
    case 'thumbs':
      // Thumbs with rotation options
      options.shapeColor = ['0284c7', '0d9488', '059669', 'ca8a04', 'dc2626', 'db2777', '9333ea', '4f46e5'];
      break;
  }

  // Add other options from config
  if (config.flip !== undefined) {
    options.flip = config.flip;
  }
  if (config.rotate !== undefined) {
    options.rotate = config.rotate;
  }

  // Apply custom options last (can override defaults)
  if (config.options) {
    Object.assign(options, config.options);
  }

  // ALWAYS force radius to 0 to prevent SVG masks that clip avatars
  // We handle circular shape with CSS clip-path instead
  options.radius = 0;

  const avatar = createAvatar(styleModule, options);
  return avatar.toString();
}

// Default avatar for when no data is provided
function generateDefaultAvatar(username: string): string {
  return generateDiceBearAvatar({
    style: 'adventurer',
    seed: username || 'default',
    backgroundColor: 'b6e3f4',
  });
}

export function Avatar({ avatarData, preset, username, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  const avatarSvg = useMemo(() => {
    // Priority 1: Uploaded image (handled separately)
    if (avatarData?.type === 'uploaded' && avatarData.uploadedUrl) {
      return null;
    }

    // Priority 2: DiceBear config
    if (avatarData?.type === 'dicebear' && avatarData.dicebear) {
      return generateDiceBearAvatar(avatarData.dicebear);
    }

    // Priority 3: Legacy custom config - convert to DiceBear
    if (avatarData?.type === 'custom' && avatarData.custom) {
      const customSeed = `${avatarData.custom.hairStyle}-${avatarData.custom.faceShape}-${avatarData.custom.eyes}`;
      return generateDiceBearAvatar({
        style: 'adventurer',
        seed: customSeed,
        backgroundColor: avatarData.custom.backgroundColor?.replace('#', '') || 'e8d5b7',
      });
    }

    // Priority 4: Legacy preset
    if (avatarData?.type === 'preset' && avatarData.preset) {
      return generateDiceBearAvatar({
        style: 'adventurer',
        seed: avatarData.preset,
        backgroundColor: 'e8d5b7',
      });
    }

    // Priority 5: Old preset prop (backwards compatibility)
    if (preset) {
      return generateDiceBearAvatar({
        style: 'adventurer',
        seed: preset,
        backgroundColor: 'e8d5b7',
      });
    }

    // Fallback: Generate from username
    return generateDefaultAvatar(username);
  }, [avatarData, preset, username]);

  // Uploaded image - no scaling needed since user controls the crop
  if (avatarData?.type === 'uploaded' && avatarData.uploadedUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={avatarData.uploadedUrl}
          alt={username}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // DiceBear SVG - scale SVG larger and clip to show face area better
  return (
    <div
      className={`${sizeClass} flex-shrink-0 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="w-[120%] h-[120%] -ml-[10%] -mt-[5%] [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: avatarSvg || '' }}
      />
    </div>
  );
}

export default Avatar;
