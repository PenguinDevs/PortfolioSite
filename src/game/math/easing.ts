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
