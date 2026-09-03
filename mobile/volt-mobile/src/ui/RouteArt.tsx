import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { color } from './tokens';

// The route is the artwork (artboards 03/16): a normalised path on a faint grid, jade, last point marked.
export function RouteArt({ points, trimmed, width, height = 220, tone = color.jade }: { points: { lat: number; lng: number }[]; trimmed?: { lat: number; lng: number }[]; width: number; height?: number; tone?: string }) {
  const all = points; const pad = 16;
  if (all.length < 2) return <Svg width={width} height={height}>{grid(width, height)}</Svg>;
  const lats = all.map((p) => p.lat), lngs = all.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const spanX = Math.max(1e-6, (maxLng - minLng) * kx), spanY = Math.max(1e-6, maxLat - minLat);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const ox = (width - spanX * scale) / 2, oy = (height - spanY * scale) / 2;
  const sx = (p: { lng: number }) => ox + (p.lng - minLng) * kx * scale, sy = (p: { lat: number }) => oy + (maxLat - p.lat) * scale;
  const path = (ps: { lat: number; lng: number }[]) => ps.map((p) => `${sx(p)},${sy(p)}`).join(' ');
  const shown = trimmed ?? all; const last = shown[shown.length - 1];
  return (
    <Svg width={width} height={height}>
      {grid(width, height)}
      {trimmed && <Polyline points={path(all)} fill="none" stroke={color.t4} strokeWidth={2} strokeDasharray="3 5" />}
      <Polyline points={path(shown)} fill="none" stroke={tone} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {last && <Circle cx={sx(last)} cy={sy(last)} r={5} fill={tone} />}
    </Svg>
  );
}

const grid = (w: number, h: number) => [0.25, 0.5, 0.75].flatMap((f, i) => [
  <Line key={`v${i}`} x1={w * f} x2={w * f} y1={0} y2={h} stroke={color.hairline} strokeWidth={1} />,
  <Line key={`h${i}`} x1={0} x2={w} y1={h * f} y2={h * f} stroke={color.hairline} strokeWidth={1} />,
]);
