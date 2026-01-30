/**
 * CustomAvatar - High-Resolution Pixel Art Avatar (128x128)
 *
 * Inspired by modern indie games (Stardew Valley, Celeste, Eastward)
 * Features:
 * - Rich color palettes with proper shading (highlight, base, shadow, deep shadow)
 * - Detailed facial features with expressive eyes
 * - Dynamic hair with volume and flow
 * - Charming pixel art aesthetic at higher resolution
 */

import React, { useMemo } from 'react';
import type { CustomAvatarConfig, FaceShape, HairStyle, EyeStyle, AccessoryType } from '@maplume/shared';

interface CustomAvatarProps {
  config: CustomAvatarConfig;
  className?: string;
}

// Grid configuration
const GRID = 32; // Internal grid (will be rendered at 128x128 via viewBox scaling)
const PX = 1; // Pixel unit size

// ===== Color Palette Generation =====
interface ColorPalette {
  highlight: string;
  base: string;
  shadow: string;
  deep: string;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function createPalette(hex: string, satBoost = 0): ColorPalette {
  const { h, s, l } = hexToHsl(hex);
  const sat = Math.min(100, s + satBoost);
  return {
    highlight: hslToHex(h, Math.max(0, sat - 10), Math.min(95, l + 18)),
    base: hex,
    shadow: hslToHex(h, Math.min(100, sat + 8), Math.max(5, l - 15)),
    deep: hslToHex(h, Math.min(100, sat + 12), Math.max(5, l - 28)),
  };
}

// ===== Pixel Drawing Primitives =====
function Px({ x, y, c }: { x: number; y: number; c: string }) {
  return <rect x={x * PX} y={y * PX} width={PX + 0.02} height={PX + 0.02} fill={c} />;
}

function PxRow({ x, y, colors }: { x: number; y: number; colors: (string | null)[] }) {
  return (
    <>
      {colors.map((c, i) => c && <Px key={i} x={x + i} y={y} c={c} />)}
    </>
  );
}

// Draw from a pattern string with color mapping
function Pattern({
  data,
  x: ox,
  y: oy,
  colors
}: {
  data: string[];
  x: number;
  y: number;
  colors: Record<string, string>;
}) {
  const pixels: React.ReactNode[] = [];
  data.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const color = colors[char];
      if (color) {
        pixels.push(<Px key={`${x}-${y}`} x={ox + x} y={oy + y} c={color} />);
      }
    });
  });
  return <>{pixels}</>;
}

// ===== Face Rendering =====
function Face({
  shape,
  palette
}: {
  shape: FaceShape;
  palette: ColorPalette;
}) {
  const { highlight: h, base: b, shadow: s, deep: d } = palette;

  // Face is roughly 18x20 pixels, centered
  const ox = 7; // offset x
  const oy = 8; // offset y

  // Different face shapes - all have highlight on top-left, shadow on bottom-right
  const patterns: Record<FaceShape, string[]> = {
    round: [
      '......hhhhhh......',
      '....hhbbbbbbhh....',
      '...hbbbbbbbbbbs...',
      '..hbbbbbbbbbbbbss.',
      '..hbbbbbbbbbbbbs..',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbs.',
      '.hbbbbbbbbbbbbbbss',
      '..hbbbbbbbbbbbbss.',
      '..hbbbbbbbbbbbss..',
      '...hbbbbbbbbsss...',
      '....ssbbbbsssd....',
      '......sssssd......',
    ],
    oval: [
      '.......hhhh.......',
      '.....hhbbbbhh.....',
      '....hbbbbbbbbh....',
      '...hbbbbbbbbbbss..',
      '..hbbbbbbbbbbbbss.',
      '..hbbbbbbbbbbbbs..',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '..hbbbbbbbbbbbbss.',
      '..hbbbbbbbbbbbss..',
      '...hbbbbbbbbsss...',
      '....hbbbbbbss.....',
      '.....hbbbbss......',
      '......hbbss.......',
      '.......sss........',
    ],
    square: [
      '....hhhhhhhhhh....',
      '...hbbbbbbbbbbhs..',
      '..hbbbbbbbbbbbbss.',
      '..hbbbbbbbbbbbbs..',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '..hbbbbbbbbbbbbss.',
      '..hbbbbbbbbbbbss..',
      '...hbbbbbbbbsss...',
      '....ssbbbbsssd....',
      '......sssssd......',
    ],
    heart: [
      '....hhhhhhhhh.....',
      '..hhbbbbbbbbbhh...',
      '.hbbbbbbbbbbbbbhs.',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '.hbbbbbbbbbbbbbbss',
      '..hbbbbbbbbbbbbss.',
      '..hbbbbbbbbbbbss..',
      '...hbbbbbbbbsss...',
      '....hbbbbbbss.....',
      '.....hbbbbss......',
      '......hbbss.......',
      '.......hss........',
      '........s.........',
    ],
  };

  const colors: Record<string, string> = {
    h: h,
    b: b,
    s: s,
    d: d,
  };

  return (
    <g className="face">
      <Pattern data={patterns[shape]} x={ox} y={oy} colors={colors} />
    </g>
  );
}

// ===== Eye Rendering =====
function Eyes({
  style,
  eyeColor,
  skinPalette
}: {
  style: EyeStyle;
  eyeColor: string;
  skinPalette: ColorPalette;
}) {
  const iris = createPalette(eyeColor, 15);

  const white = '#FFFFFF';
  const whiteShade = '#E8E4E8';
  const pupil = '#1A1A1A';
  const lash = '#3A3535';
  const blush = '#FFB8B8';

  // Eye position
  const leftX = 10;
  const rightX = 18;
  const eyeY = 15;

  // Eye patterns by style
  const renderEyes = () => {
    switch (style) {
      case 'round':
      case 'wide':
        // Big expressive eyes
        return (
          <>
            {/* Left eye */}
            <Pattern
              data={[
                '..LLLL..',
                '.LwwwwL.',
                'LwWWiiLL',
                'LwWiipLL',
                'LwiiipLL',
                '.LiiiiL.',
                '..LLLL..',
              ]}
              x={leftX - 1}
              y={eyeY - 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                I: iris.highlight,
                p: pupil,
              }}
            />
            {/* Right eye */}
            <Pattern
              data={[
                '..LLLL..',
                '.LwwwwL.',
                'LLiiWWwL',
                'LLpiWWwL',
                'LLpiiiwL',
                '.LiiiiL.',
                '..LLLL..',
              ]}
              x={rightX - 1}
              y={eyeY - 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                I: iris.highlight,
                p: pupil,
              }}
            />
            {/* Highlights */}
            <Px x={leftX + 1} y={eyeY} c={white} />
            <Px x={rightX + 3} y={eyeY} c={white} />
          </>
        );

      case 'almond':
      case 'determined':
        // Sharp, confident eyes
        return (
          <>
            {/* Left eye */}
            <Pattern
              data={[
                '.LLLLL.',
                'LwWiipL',
                'LwiiipL',
                '.LiiiL.',
                '..LLL..',
              ]}
              x={leftX - 1}
              y={eyeY}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            {/* Right eye */}
            <Pattern
              data={[
                '.LLLLL.',
                'LpiiwWL',
                'LpiiiwL',
                '.LiiiL.',
                '..LLL..',
              ]}
              x={rightX - 1}
              y={eyeY}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            {/* Highlights */}
            <Px x={leftX + 1} y={eyeY + 1} c={white} />
            <Px x={rightX + 3} y={eyeY + 1} c={white} />
            {/* Eyebrow accent for determined */}
            {style === 'determined' && (
              <>
                <PxRow x={leftX - 1} y={eyeY - 1} colors={[lash, lash, lash, lash]} />
                <PxRow x={rightX} y={eyeY - 1} colors={[lash, lash, lash, lash]} />
              </>
            )}
          </>
        );

      case 'narrow':
        // Subtle, calm eyes
        return (
          <>
            <Pattern
              data={[
                'LLLLLL',
                'wWiipL',
                'LiiiLL',
              ]}
              x={leftX - 1}
              y={eyeY + 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            <Pattern
              data={[
                'LLLLLL',
                'LpiWWw',
                'LLiiiL',
              ]}
              x={rightX - 1}
              y={eyeY + 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            <Px x={leftX + 1} y={eyeY + 1} c={white} />
            <Px x={rightX + 3} y={eyeY + 1} c={white} />
          </>
        );

      case 'sparkle':
        // Starry anime eyes with extra highlights
        return (
          <>
            {/* Left eye */}
            <Pattern
              data={[
                '..LLLL..',
                '.LwwwwL.',
                'LwWWiiLL',
                'LwWiipLL',
                'LwiWipLL',
                '.LiWiiL.',
                '..LLLL..',
              ]}
              x={leftX - 1}
              y={eyeY - 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            {/* Right eye */}
            <Pattern
              data={[
                '..LLLL..',
                '.LwwwwL.',
                'LLiiWWwL',
                'LLpiWWwL',
                'LLpiWiwL',
                '.LiiWiL.',
                '..LLLL..',
              ]}
              x={rightX - 1}
              y={eyeY - 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            {/* Extra sparkles */}
            <Px x={leftX} y={eyeY - 1} c={white} />
            <Px x={leftX + 2} y={eyeY + 2} c={white} />
            <Px x={rightX + 4} y={eyeY - 1} c={white} />
            <Px x={rightX + 2} y={eyeY + 2} c={white} />
          </>
        );

      case 'gentle':
        // Soft, kind eyes with slight droop
        return (
          <>
            <Pattern
              data={[
                '..LLL..',
                '.LwwwL.',
                'LwWiipL',
                'LwiiipL',
                '.LiiiL.',
                '..LLL..',
              ]}
              x={leftX - 1}
              y={eyeY}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            <Pattern
              data={[
                '..LLL..',
                '.LwwwL.',
                'LpiiwWL',
                'LpiiiwL',
                '.LiiiL.',
                '..LLL..',
              ]}
              x={rightX - 1}
              y={eyeY}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            <Px x={leftX + 1} y={eyeY + 1} c={white} />
            <Px x={rightX + 3} y={eyeY + 1} c={white} />
          </>
        );

      default: // 'default'
        // Standard cute eyes
        return (
          <>
            <Pattern
              data={[
                '.LLLL.',
                'LwwwwL',
                'LWWiiL',
                'LWiipL',
                'LiiipL',
                '.LiiL.',
                '..LL..',
              ]}
              x={leftX - 1}
              y={eyeY - 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            <Pattern
              data={[
                '.LLLL.',
                'LwwwwL',
                'LiiWWL',
                'LpiWWL',
                'LpiiiiL',
                '.LiiL.',
                '..LL..',
              ]}
              x={rightX - 1}
              y={eyeY - 1}
              colors={{
                L: lash,
                w: whiteShade,
                W: white,
                i: iris.base,
                p: pupil,
              }}
            />
            <Px x={leftX} y={eyeY} c={white} />
            <Px x={rightX + 4} y={eyeY} c={white} />
          </>
        );
    }
  };

  return (
    <g className="eyes">
      {renderEyes()}
      {/* Blush marks */}
      <Px x={8} y={eyeY + 5} c={blush} />
      <Px x={9} y={eyeY + 5} c={blush} />
      <Px x={22} y={eyeY + 5} c={blush} />
      <Px x={23} y={eyeY + 5} c={blush} />
    </g>
  );
}

// ===== Nose & Mouth =====
function NoseAndMouth({ skinPalette }: { skinPalette: ColorPalette }) {
  const nose = skinPalette.shadow;
  const lip = '#D4847C';
  const lipHighlight = '#E8A098';

  return (
    <g className="nose-mouth">
      {/* Nose - subtle shadow */}
      <Px x={15} y={21} c={nose} />
      <Px x={16} y={21} c={nose} />

      {/* Mouth - gentle smile */}
      <Pattern
        data={[
          '.hh.',
          'lmml',
          '.ll.',
        ]}
        x={14}
        y={23}
        colors={{
          h: lipHighlight,
          m: lip,
          l: skinPalette.shadow,
        }}
      />
    </g>
  );
}

// ===== Hair Rendering =====
function Hair({
  style,
  palette,
  behindFace
}: {
  style: HairStyle;
  palette: ColorPalette;
  behindFace: boolean;
}) {
  const { highlight: h, base: b, shadow: s, deep: d } = palette;
  const colors: Record<string, string> = { h, b, s, d };

  // Hair patterns - front and back layers
  const hairData: Record<HairStyle, { front: string[]; back?: string[]; frontY: number; backY?: number }> = {
    short: {
      front: [
        '......hhhhhhhh......',
        '....hhbbbbbbbbhh....',
        '...hbbbbbbbbbbbbs...',
        '..hbbbbbbbbbbbbbbss.',
        '..hbhbbbbbbbbhbbbss.',
        '.hbbhsbbbbbbshbbbbss',
        '.hbbhsbbbbbbshbbbbss',
        '.hbb.s......s.bbbbs.',
        '.hb...........bbbbs.',
        '..h............bbbs.',
      ],
      frontY: 0,
    },
    medium: {
      front: [
        '......hhhhhhhh......',
        '....hhbbbbbbbbhh....',
        '...hbbbbbbbbbbbbs...',
        '..hbbbbbbbbbbbbbbss.',
        '..hbhbbbbbbbbhbbbss.',
        '.hbbhsbbbbbbshbbbbss',
        '.hbbhsbbbbbbshbbbbss',
        '.hbb.s......s.bbbbs.',
        '.hb...........bbbbs.',
        'hbb............bbbbs',
        'hbs............sbbbs',
        'hbs............sbbbs',
        'hbs............sbbbs',
        '.bs............sbbs.',
      ],
      frontY: 0,
    },
    long: {
      front: [
        '.......hhhhhhh......',
        '.....hhbbbbbbbhh....',
        '....hbbbbbbbbbbbs...',
        '...hbbbbbbbbbbbbbs..',
        '..hbbhbbbbbbbhbbbbs.',
        '.hbbbhsbbbbbshbbbbbss',
        '.hbbbhsbbbbbshbbbbbss',
        '.hbbb.s.....s.bbbbbs.',
        '.hbb...........bbbbs.',
        'hbbs............bbbbs',
        'hbbs............sbbbs',
        'hbbs............sbbbs',
        'hbbs............sbbbs',
        'hbbs............sbbbs',
        'hbbs............sbbbs',
        'hbs..............sbbs',
        'hbs..............sbbs',
        '.bs..............sbs.',
        '.bs..............sbs.',
        '..s..............ss..',
      ],
      back: [
        '..bbs..........sbb..',
        '..bbs..........sbb..',
        '..bbs..........sbb..',
        '..bbs..........sbb..',
        '..bbs..........sbb..',
        '...bs..........sb...',
      ],
      frontY: 0,
      backY: 26,
    },
    curly: {
      front: [
        '.....hbhbhbhbh......',
        '...hbhbbbbbbbhbh....',
        '..hbbbbbbbbbbbbbhs..',
        '.hbbbbbbbbbbbbbbbbss',
        '.hbhbbbbbbbbbbhbbbss',
        'hbbhsbbbbbbbbshbbbbss',
        'hbbhsbbbbbbbbshbbbbss',
        'hbb.s........s.bbbbs',
        'hb............bbbbbs',
        'bhs...........sbbbbbs',
        'bhs...........sbbbbs',
        'bhs...........sbbbbs',
        'bhs...........sbbbbs',
        '.bhsbsbsbsbsbsbbbs.',
      ],
      frontY: 0,
    },
    wavy: {
      front: [
        '.....hhbhbhbhh......',
        '....hbbbbbbbbbhh....',
        '...hbbbbbbbbbbbbs...',
        '..hbbbbbbbbbbbbbbss.',
        '..hbhbbbbbbbbhbbbss.',
        '.hbbhsbbbbbbshbbbbss',
        '.hbbhsbbbbbbshbbbbss',
        '.hbb.s......s.bbbbs.',
        '.hb...........bbbbs.',
        'hbbs...........bbbbs',
        'hbbs...........sbbbs',
        '.bbs...........sbbbs',
        '.bbs...........sbbbs',
        '.bbs...........sbbs.',
        '.bs.............sbs.',
        '.bs.............sbs.',
        '..s.............ss..',
      ],
      frontY: 0,
    },
    bun: {
      front: [
        '.......bbbb.........',
        '......bbbbbb........',
        '.....hbbssbbs.......',
        '......hbbbbh........',
        '......hhhhhhhh......',
        '....hhbbbbbbbbhh....',
        '...hbbbbbbbbbbbbs...',
        '..hbbbbbbbbbbbbbbss.',
        '..hbhbbbbbbbbhbbbss.',
        '.hbbhsbbbbbbshbbbbss',
        '.hbbhsbbbbbbshbbbbss',
        '.hbb.s......s.bbbbs.',
        '.hb...........bbbbs.',
        '..h............bbbs.',
      ],
      frontY: 0,
    },
    ponytail: {
      front: [
        '......hhhhhhhh..bb..',
        '....hhbbbbbbbbhbbbs.',
        '...hbbbbbbbbbbbbbbs.',
        '..hbbbbbbbbbbbbbbss.',
        '..hbhbbbbbbbbhbbbss.',
        '.hbbhsbbbbbbshbbbbss',
        '.hbbhsbbbbbbshbbbbss',
        '.hbb.s......s.bbbb.b',
        '.hb...........bbbb.b',
        '..h............bbb.b',
        '..................bs',
        '..................bs',
        '..................bs',
        '..................bs',
        '...................s',
      ],
      frontY: 0,
    },
    spiky: {
      front: [
        '...h...hhh...h......',
        '..hbh.hbbbh.hbh.....',
        '..hbbhbbbbbhbbbh....',
        '..hbbbbbbbbbbbbhs...',
        '..hbbbbbbbbbbbbbbss.',
        '.hbbhbbbbbbbhbbbbss.',
        '.hbbhsbbbbbbshbbbss.',
        '.hbb.s......s.bbbbs.',
        '.hb...........bbbbs.',
        '..h............bbbs.',
      ],
      frontY: 0,
    },
    sideSweep: {
      front: [
        '...hhhhhhhhhhhh.....',
        '..hbbbbbbbbbbbbh....',
        '.hbbbbbbbbbbbbbbs...',
        'hbbbbbbbbbbbbbbbbss.',
        'hbbbbbbbbbbbhbbbbss.',
        'hbbbsbbbbbbshbbbbs..',
        'hbbbsbbbbbbshbbbbs..',
        'hbbb.s.....s.bbbs...',
        'hbb...........bbs...',
        'hbs...........bbs...',
        'hbs............bs...',
        '.bs............s....',
        '.bs.................',
        '..s.................',
      ],
      frontY: 0,
    },
    twintails: {
      front: [
        '......hhhhhhhh......',
        '....hhbbbbbbbbhh....',
        '...hbbbbbbbbbbbbs...',
        '..hbbbbbbbbbbbbbbss.',
        '..hbhbbbbbbbbhbbbss.',
        '.hbbhsbbbbbbshbbbbss',
        '.hbbhsbbbbbbshbbbbss',
        'bbb.s........s.bbbbb',
        'bbb............bbbbb',
        'bbs............sbbbs',
        'bbs............sbbbs',
        'bbs............sbbbs',
        'bs..............sbbs',
        'bs..............sbbs',
        's................sbs',
        's................sbs',
        '.................ss.',
      ],
      frontY: 0,
    },
    bald: {
      front: [
        '......hh.hh.........',
      ],
      frontY: 5,
    },
    buzz: {
      front: [
        '......ssssss........',
        '....ssssssssss......',
        '...ssssssssssss.....',
        '..ssssssssssssss....',
        '..ss..ssssss..ss....',
      ],
      frontY: 3,
    },
    mohawk: {
      front: [
        '.......hbbh.........',
        '......hbbbbh........',
        '.....hbbbbbbh.......',
        '.....hbbbbbbh.......',
        '....hbbbbbbbbh......',
        '....hbbssssbbh......',
        '...sssssssssssss....',
        '..ssss......ssss....',
        '..ss..........ss....',
      ],
      frontY: 0,
    },
  };

  const data = hairData[style] || hairData.short;

  if (behindFace && data.back) {
    return (
      <g className="hair-back">
        <Pattern data={data.back} x={6} y={data.backY || 26} colors={colors} />
      </g>
    );
  }

  if (!behindFace) {
    return (
      <g className="hair-front">
        <Pattern data={data.front} x={6} y={data.frontY} colors={colors} />
      </g>
    );
  }

  return null;
}

// ===== Accessories =====
function Accessory({
  type,
  hairColor
}: {
  type: AccessoryType;
  hairColor: string;
}) {
  const accessories: Record<AccessoryType, { data: string[]; x: number; y: number; colors: Record<string, string> } | null> = {
    glasses: {
      data: [
        '.GGGGGG..GGGGGG.',
        'G.gggg.GG.gggg.G',
        'G.gggg.GG.gggg.G',
        '.GGGGGG..GGGGGG.',
      ],
      x: 8,
      y: 15,
      colors: {
        G: '#3A3A3A',
        g: 'rgba(200,220,255,0.3)',
      },
    },
    sunglasses: {
      data: [
        '.SSSSSS..SSSSSS.',
        'SssssssSssssssS',
        'SssssssSssssssS',
        '.SSSSSS..SSSSSS.',
      ],
      x: 8,
      y: 15,
      colors: {
        S: '#1A1A1A',
        s: '#2D2D2D',
      },
    },
    hat: {
      data: [
        '......CCCCCC......',
        '....CCCCCCCCCC....',
        '...CCCCCCCCCCCC...',
        '..CCCCccccCCCCCC..',
        '..CCCCccccCCCCCC..',
        '.AAAAAAAAAAAAAAA..',
        'AAAAAAAAAAAAAAAA..',
      ],
      x: 6,
      y: -2,
      colors: {
        C: '#8B7355',
        c: '#6B5344',
        A: '#5D4E37',
      },
    },
    headband: {
      data: [
        'RRRRRRRRRRRRRRRR',
        'rrrrrrrrrrrrrrrr',
        'PP..............',
        'pP..............',
        '.p..............',
      ],
      x: 8,
      y: 5,
      colors: {
        R: '#FF7EB3',
        r: '#E84A8A',
        P: '#FF7EB3',
        p: '#E84A8A',
      },
    },
    earrings: {
      data: [
        'G',
        'g',
        'G',
      ],
      x: 7,
      y: 18,
      colors: {
        G: '#FFD700',
        g: '#DAA520',
      },
    },
    none: null,
  };

  const acc = accessories[type];
  if (!acc) return null;

  // For earrings, render on both sides
  if (type === 'earrings') {
    return (
      <g className="accessory">
        <Pattern data={acc.data} x={acc.x} y={acc.y} colors={acc.colors} />
        <Pattern data={acc.data} x={24} y={acc.y} colors={acc.colors} />
      </g>
    );
  }

  return (
    <g className="accessory">
      <Pattern data={acc.data} x={acc.x} y={acc.y} colors={acc.colors} />
    </g>
  );
}

// ===== Main Component =====
export function CustomAvatar({ config, className = '' }: CustomAvatarProps) {
  const {
    faceShape,
    skinTone,
    hairStyle,
    hairColor,
    eyes,
    eyeColor,
    accessory,
    backgroundColor,
  } = config;

  // Create color palettes
  const skinPalette = useMemo(() => createPalette(skinTone, 5), [skinTone]);
  const hairPalette = useMemo(() => createPalette(hairColor, 10), [hairColor]);
  const actualEyeColor = eyeColor || '#5B8C5A';

  // Determine if hair needs back layer
  const hasBackHair = ['long', 'wavy', 'twintails'].includes(hairStyle);

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      className={`w-full h-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Background with subtle gradient via dithering */}
      <defs>
        <radialGradient id="bgGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={backgroundColor} />
          <stop offset="100%" stopColor={backgroundColor} />
        </radialGradient>
      </defs>
      <circle cx={GRID / 2} cy={GRID / 2} r={GRID / 2} fill={backgroundColor} />

      {/* Hair back layer */}
      {hasBackHair && (
        <Hair style={hairStyle} palette={hairPalette} behindFace={true} />
      )}

      {/* Face */}
      <Face shape={faceShape} palette={skinPalette} />

      {/* Features */}
      <Eyes style={eyes} eyeColor={actualEyeColor} skinPalette={skinPalette} />
      <NoseAndMouth skinPalette={skinPalette} />

      {/* Hair front */}
      <Hair style={hairStyle} palette={hairPalette} behindFace={false} />

      {/* Accessories */}
      <Accessory type={accessory} hairColor={hairColor} />
    </svg>
  );
}

export default CustomAvatar;
