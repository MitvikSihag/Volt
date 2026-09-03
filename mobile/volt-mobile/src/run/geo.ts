export type Pt = { lat: number; lng: number; alt?: number | null; t: number; seg: number };

const R = 6371000;
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance along the track; pauses (segment changes) contribute nothing. */
export function totalDistance(pts: Pt[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].seg === pts[i - 1].seg) d += haversine(pts[i - 1], pts[i]);
  return d;
}

export function elevationGain(pts: Pt[], threshold = 1): number {
  let gain = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1].alt, b = pts[i].alt;
    if (a != null && b != null && pts[i].seg === pts[i - 1].seg && b - a > threshold) gain += b - a;
  }
  return gain;
}

export const paceSecPerKm = (meters: number, ms: number): number | null => (meters < 20 || ms <= 0 ? null : (ms / 1000) / (meters / 1000));

export const formatPace = (sec: number | null) => (sec == null || !isFinite(sec) ? '—' : `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`);

export type Split = { distanceMeters: number; durationSeconds: number; pace: number; complete: boolean };

/** Splits every `every` metres of moving distance; the trailing partial split is flagged incomplete. */
export function splits(pts: Pt[], every = 1000): Split[] {
  const out: Split[] = [];
  let acc = 0, accMs = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].seg !== pts[i - 1].seg) continue;
    let d = haversine(pts[i - 1], pts[i]); let ms = pts[i].t - pts[i - 1].t;
    while (acc + d >= every) {
      const need = every - acc; const frac = d === 0 ? 0 : need / d;
      const secs = (accMs + ms * frac) / 1000;
      out.push({ distanceMeters: every, durationSeconds: secs, pace: secs / (every / 1000), complete: true });
      d -= need; ms -= ms * frac; acc = 0; accMs = 0;
    }
    acc += d; accMs += ms;
  }
  if (acc > 20) out.push({ distanceMeters: acc, durationSeconds: accMs / 1000, pace: (accMs / 1000) / (acc / 1000), complete: false });
  return out;
}

/** Current pace over the last `windowMs` of the active segment. */
export function currentPace(pts: Pt[], now: number, windowMs = 30000): number | null {
  const last = pts[pts.length - 1]; if (!last) return null;
  const recent = pts.filter((p) => p.seg === last.seg && p.t >= now - windowMs);
  if (recent.length < 2) return null;
  return paceSecPerKm(totalDistance(recent), recent[recent.length - 1].t - recent[0].t);
}

/** Drop `startM` metres from the start and `endM` from the end (privacy trim). */
export function trimEnds(pts: Pt[], startM: number, endM: number): Pt[] {
  let i = 0, acc = 0;
  while (i < pts.length - 1 && acc < startM) { acc += haversine(pts[i], pts[i + 1]); i++; }
  let j = pts.length - 1; acc = 0;
  while (j > 0 && acc < endM) { acc += haversine(pts[j - 1], pts[j]); j--; }
  return j > i ? pts.slice(i, j + 1) : [];
}

/** Google encoded polyline (precision 5). */
export function encodePolyline(pts: { lat: number; lng: number }[]): string {
  let out = ''; let lat = 0, lng = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1; let s = '';
    while (n >= 0x20) { s += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; }
    return s + String.fromCharCode(n + 63);
  };
  for (const p of pts) {
    const la = Math.round(p.lat * 1e5), ln = Math.round(p.lng * 1e5);
    out += enc(la - lat) + enc(ln - lng); lat = la; lng = ln;
  }
  return out;
}
