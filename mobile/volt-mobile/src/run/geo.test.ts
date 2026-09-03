import { currentPace, encodePolyline, formatPace, haversine, splits, totalDistance, trimEnds, Pt } from './geo';

// ~1 km straight north from Berlin at 3 m/s: one point every 30 m / 10 s
const line = (n: number, seg = 0, t0 = 0): Pt[] => Array.from({ length: n }, (_, i) => ({ lat: 52.52 + i * 30 / 111320, lng: 13.405, t: t0 + i * 10000, seg }));

test('haversine of one degree of latitude is ~111 km', () => expect(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, -2));

test('totalDistance ignores the jump across a pause', () => {
  const a = line(11); const b = line(11, 1, 200000).map((p) => ({ ...p, lat: p.lat + 0.01 }));
  expect(totalDistance([...a, ...b])).toBeCloseTo(600, -1);
});

test('splits every km with a trailing partial', () => {
  const s = splits(line(41)); // 40 × 30 m = 1200 m
  expect(s).toHaveLength(2);
  expect(s[0]).toMatchObject({ distanceMeters: 1000, complete: true });
  expect(s[0].pace).toBeCloseTo(333.3, 0);
  expect(s[1].complete).toBe(false);
  expect(s[1].distanceMeters).toBeCloseTo(200, -1);
});

test('currentPace uses the last 30 s only', () => {
  const p = currentPace(line(11), 100000);
  expect(p).toBeCloseTo(333.3, 0);
});

test('trimEnds removes ~200 m from each end', () => {
  const t = trimEnds(line(41), 200, 200);
  expect(t.length).toBeLessThan(41);
  expect(totalDistance(t)).toBeCloseTo(1200 - 400, -2);
});

test('encodePolyline matches the reference vector', () => {
  expect(encodePolyline([{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }])).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
});

test('formatPace', () => { expect(formatPace(232)).toBe('3:52'); expect(formatPace(null)).toBe('—'); });
