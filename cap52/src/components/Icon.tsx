import { View, type ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Jeu d'icônes maison, au trait, dessiné pour CAP 52 (aucune dépendance externe). */
const ICONS = {
  home: <Path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />,
  grid: (
    <>
      <Rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <Rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <Rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <Rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  chart: <Path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />,
  user: (
    <>
      <Circle cx="12" cy="8.5" r="3.5" />
      <Path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" />
    </>
  ),
  check: <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  chevronRight: <Path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  chevronLeft: <Path d="M14.5 5.5 8 12l6.5 6.5" />,
  bell: <Path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 20.5h4" />,
  share: <Path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v6.5h14V13" />,
  star: <Path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />,
  target: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Circle cx="12" cy="12" r="4.5" />
      <Circle cx="12" cy="12" r="1" />
    </>
  ),
  plane: <Path d="M3.5 13.5 21 6l-4.5 13-4-5-5 1.5zM12.5 14 21 6" />,
  car: (
    <>
      <Path d="M4 16v-3.5L6 8h12l2 4.5V16zM4 16v2.5h3V16M17 16v2.5h3V16" />
      <Circle cx="8" cy="13" r="0.8" />
      <Circle cx="16" cy="13" r="0.8" />
    </>
  ),
  house: <Path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  shield: <Path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z" />,
  sparkle: <Path d="M12 4c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6zM18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z" />,
  trash: <Path d="M5 7h14M10 4h4M7 7l1 13h8l1-13M10.5 11v5M13.5 11v5" />,
  edit: <Path d="M5 19h3.5L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5" />,
  skip: <Path d="M6 6l8 6-8 6zM17.5 6v12" />,
  undo: <Path d="M8.5 8H15a4.5 4.5 0 0 1 0 9H9M8.5 8 11.5 5M8.5 8l3 3" />,
  users: (
    <>
      <Circle cx="9" cy="9" r="3" />
      <Path d="M3.5 19c.9-3 2.9-4.5 5.5-4.5s4.6 1.5 5.5 4.5M15 6.2a3 3 0 0 1 0 5.6M17 14.8c1.7.5 2.9 1.9 3.5 4.2" />
    </>
  ),
  message: <Path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z" />,
  download: <Path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14" />,
  lock: (
    <>
      <Rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  piggy: <Path d="M5 12.5c0-3.3 3.1-5.5 7-5.5 1.6 0 3 .3 4.2 1L19 6.5V10c.8.7 1.3 1.5 1.5 2.5H22v3h-2c-.5 1-1.3 1.8-2.5 2.4V20h-3v-1.6a11 11 0 0 1-3.5 0V20h-3v-2.3C6.3 16.6 5 14.7 5 12.5zM9 7.3V5h3" />,
} as const;

export type IconName = keyof typeof ICONS;
export const CHALLENGE_ICONS: IconName[] = ['target', 'plane', 'car', 'house', 'shield', 'sparkle', 'piggy'];

export function isIconName(value: string): value is IconName {
  return value in ICONS;
}

export function Icon({ name, size = 24, color, strokeWidth = 1.8 }: { name: IconName; size?: number; color: ColorValue; strokeWidth?: number }) {
  // Décorative : masquée des lecteurs d'écran (le libellé est porté par l'élément parent).
  return (
    <View aria-hidden pointerEvents="none">
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[name]}
      </Svg>
    </View>
  );
}
