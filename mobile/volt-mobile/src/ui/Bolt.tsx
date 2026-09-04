import Svg, { Polygon } from 'react-native-svg';
import { color } from './tokens';

// The Volt mark: white split-V bolt, one flat tone, never ember. Brand lives on edge surfaces only.
export const BOLT_POINTS = '14,20 34,20 50,50 66,20 86,20 58,54 50,88 42,54';

export const Bolt = ({ size = 32, fill = color.t1 }: { size?: number; fill?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100"><Polygon points={BOLT_POINTS} fill={fill} /></Svg>
);
