import type { Vector3 } from 'three';

// quadratic bezier evaluation, writes result into `out` to avoid allocations
export function quadraticBezier(a: Vector3, b: Vector3, c: Vector3, t: number, out: Vector3): Vector3 {
  const u = 1 - t;
  out.x = u * u * a.x + 2 * u * t * b.x + t * t * c.x;
  out.y = u * u * a.y + 2 * u * t * b.y + t * t * c.y;
  out.z = u * u * a.z + 2 * u * t * b.z + t * t * c.z;
  return out;
}

// ease out cubic for smooth deceleration
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ease in cubic: stays low then accelerates at the end
export function easeInCubic(t: number): number {
  return t * t * t;
}

// ease in-out cubic: slow start, fast middle, slow end
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ease in sine: gradual start that accelerates at the end
export function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

// ease out back: overshoots slightly then settles (good for rotation snap)
export function easeOutBack(t: number, overshoot = 1.70158): number {
  const s = overshoot;
  const t1 = t - 1;
  return t1 * t1 * ((s + 1) * t1 + s) + 1;
}
