import {useTheme} from './ThemeContext';

export interface AppColors {
  // Backgrounds
  bg: string;
  surface: string;
  card: string;
  border: string;
  // Brand / accent
  teal: string;
  tealDim: string;
  tealBorder: string;
  // Status
  red: string;
  amber: string;
  purple: string;
  blue: string;
  green: string;
  // Text
  text: string;
  textSub: string;
  textDim: string;
}

const dark: AppColors = {
  bg:         '#070B0F',
  surface:    '#0F1923',
  card:       '#111A24',
  border:     '#1C2A36',
  teal:       '#00D4B8',
  tealDim:    '#00D4B830',
  tealBorder: '#00D4B855',
  red:        '#FF5C6A',
  amber:      '#FFB347',
  purple:     '#A78BFA',
  blue:       '#3B82F6',
  green:      '#3FB950',
  text:       '#E8F0F7',
  textSub:    '#6B8399',
  textDim:    '#3D5166',
};

const light: AppColors = {
  bg:         '#F0F4F8',
  surface:    '#FFFFFF',
  card:       '#FFFFFF',
  border:     '#D1D9E0',
  teal:       '#009E8C',
  tealDim:    '#009E8C22',
  tealBorder: '#009E8C55',
  red:        '#D93244',
  amber:      '#C87C00',
  purple:     '#7C5CC4',
  blue:       '#1D5EBB',
  green:      '#217A3A',
  text:       '#111827',
  textSub:    '#4B5563',
  textDim:    '#9CA3AF',
};

export function useColors(): AppColors {
  const {isDark} = useTheme();
  return isDark ? dark : light;
}
