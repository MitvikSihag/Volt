import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { color, font } from './tokens';

// Artboard 13: one thin line, last point marked, y ticks left, month ticks below. Draws once; no animation.
export function LineChart({ points, width, height = 170, tone = color.ember, unit = '' }: { points: { date: string; value: number }[]; width: number; height?: number; tone?: string; unit?: string }) {
  if (points.length === 0) return null;
  const padL = 34, padR = 16, padT = 18, padB = 24;
  const xs = points.map((p) => Date.parse(p.date)); const ys = points.map((p) => p.value);
  const x0 = Math.min(...xs), x1 = Math.max(...xs); const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const ySpan = Math.max(1, yMax - yMin) * 1.2; const yLo = yMin - (ySpan - (yMax - yMin)) / 2;
  const sx = (x: number) => padL + (x1 === x0 ? (width - padL - padR) / 2 : ((x - x0) / (x1 - x0)) * (width - padL - padR));
  const sy = (y: number) => padT + (1 - (y - yLo) / ySpan) * (height - padT - padB);
  const pts = points.map((p) => `${sx(Date.parse(p.date))},${sy(p.value)}`).join(' ');
  const last = points[points.length - 1];
  const months = [...new Set(xs.map((x) => new Date(x).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()))];
  const monthX = months.map((m) => xs.find((x) => new Date(x).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() === m)!);
  return (
    <Svg width={width} height={height}>
      {[yMax, yMin].map((v, i) => (
        <SvgText key={i} x={0} y={sy(v) + 4} fill={color.t3} fontFamily={font.mono} fontSize={10}>{Math.round(v)}</SvgText>
      ))}
      <Line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB} stroke={color.hairline} strokeWidth={1} />
      <Polyline points={pts} fill="none" stroke={tone} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={sx(Date.parse(last.date))} cy={sy(last.value)} r={4} fill={tone} />
      <SvgText x={sx(Date.parse(last.date))} y={sy(last.value) - 10} fill={color.t1} fontFamily={font.mono} fontSize={10} textAnchor="end">{Math.round(last.value * 10) / 10}{unit}</SvgText>
      {months.map((m, i) => (
        <SvgText key={m} x={sx(monthX[i])} y={height - 8} fill={color.t3} fontFamily={font.mono} fontSize={10} textAnchor="middle">{m}</SvgText>
      ))}
    </Svg>
  );
}
