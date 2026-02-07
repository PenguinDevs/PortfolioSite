import { Vector3 } from 'three';

// A physical model of a spring based on Hooke's law.
// Position and velocity are computed analytically (closed-form) and only
// evaluated on access, making it efficient for lazy use cases.
//
// Supports n-dimensional values internally (stored as number[]), with
// convenience methods for scalar and Vector3 usage.
//
// Based on Quenty's Spring module from NevermoreEngine:
// https://github.com/Quenty/NevermoreEngine/blob/main/src/spring/src/Shared/Spring.lua
//
// Visualization: https://www.desmos.com/calculator/hn2i9shxbz

type ClockFn = () => number;

const DEFAULT_CLOCK: ClockFn = () => performance.now() / 1000;

export class Spring {
  private _clock: ClockFn;
  private _time0: number;
  private _position0: number[];
  private _velocity0: number[];
  private _target: number[];
  private _damper: number;
  private _speed: number;
  private readonly _dimensions: number;

  private constructor(initial: number[], clock: ClockFn) {
    this._clock = clock;
    this._time0 = clock();
    this._dimensions = initial.length;
    this._position0 = [...initial];
    this._velocity0 = new Array(this._dimensions).fill(0);
    this._target = [...initial];
    this._damper = 1;
    this._speed = 1;
  }

  // Create a 1D spring from a scalar value
  static scalar(initial: number = 0, clock: ClockFn = DEFAULT_CLOCK): Spring {
    return new Spring([initial], clock);
  }

  // Create a 3D spring from a Vector3
  static vector3(initial?: Vector3, clock: ClockFn = DEFAULT_CLOCK): Spring {
    const v = initial ?? new Vector3();
    return new Spring([v.x, v.y, v.z], clock);
  }

  // The core analytical solver. Computes position and velocity at time `now`
  // using the closed-form solution of the damped harmonic oscillator.
  // Handles all three regimes: underdamped, critically damped, overdamped.
  private _positionVelocity(now: number): [number[], number[]] {
    const p0 = this._position0;
    const v0 = this._velocity0;
    const p1 = this._target;
    const d = this._damper;
    const s = this._speed;
    const n = this._dimensions;

    const t = s * (now - this._time0);
    const d2 = d * d;

    let h: number;
    let si: number;
    let co: number;

    if (d2 < 1) {
      // Underdamped
      h = Math.sqrt(1 - d2);
      const ep = Math.exp(-d * t) / h;
      co = ep * Math.cos(h * t);
      si = ep * Math.sin(h * t);
    } else if (d2 === 1) {
      // Critically damped
      h = 1;
      const ep = Math.exp(-d * t) / h;
      co = ep;
      si = ep * t;
    } else {
      // Overdamped
      h = Math.sqrt(d2 - 1);
      const u = Math.exp((-d + h) * t) / (2 * h);
      const v = Math.exp((-d - h) * t) / (2 * h);
      co = u + v;
      si = u - v;
    }

    // Coefficients are scalars, computed once and applied to all dimensions
    const a0 = h * co + d * si;
    const a1 = 1 - (h * co + d * si);
    const a2 = si / s;

    const b0 = -s * si;
    const b1 = s * si;
    const b2 = h * co - d * si;

    const position = new Array(n);
    const velocity = new Array(n);
    for (let i = 0; i < n; i++) {
      position[i] = a0 * p0[i] + a1 * p1[i] + a2 * v0[i];
      velocity[i] = b0 * p0[i] + b1 * p1[i] + b2 * v0[i];
    }

    return [position, velocity];
  }

  // Bake current state so future evaluations start from `now`
  private _bake(now: number): [number[], number[]] {
    const [position, velocity] = this._positionVelocity(now);
    this._position0 = position;
    this._velocity0 = velocity;
    this._time0 = now;
    return [position, velocity];
  }

  // -- Raw array accessors --

  get position(): number[] {
    return this._positionVelocity(this._clock())[0];
  }

  set position(value: number[]) {
    const now = this._clock();
    const [, velocity] = this._positionVelocity(now);
    this._position0 = [...value];
    this._velocity0 = velocity;
    this._time0 = now;
  }

  get velocity(): number[] {
    return this._positionVelocity(this._clock())[1];
  }

  set velocity(value: number[]) {
    const now = this._clock();
    const [position] = this._positionVelocity(now);
    this._position0 = position;
    this._velocity0 = [...value];
    this._time0 = now;
  }

  get target(): number[] {
    return [...this._target];
  }

  set target(value: number[]) {
    const now = this._clock();
    this._bake(now);
    this._target = [...value];
  }

  get damper(): number {
    return this._damper;
  }

  set damper(value: number) {
    const now = this._clock();
    this._bake(now);
    this._damper = value;
  }

  get speed(): number {
    return this._speed;
  }

  set speed(value: number) {
    const now = this._clock();
    this._bake(now);
    this._speed = Math.max(0, value);
  }

  get clock(): ClockFn {
    return this._clock;
  }

  set clock(value: ClockFn) {
    const now = this._clock();
    this._bake(now);
    this._clock = value;
    this._time0 = value();
  }

  // -- Scalar convenience --

  get value(): number {
    return this.position[0];
  }

  set value(v: number) {
    this.position = [v];
  }

  get targetValue(): number {
    return this._target[0];
  }

  set targetValue(v: number) {
    this.target = [v];
  }

  // -- Vector3 convenience --

  // Read the current position into an existing Vector3 (or create one)
  getPosition3(out?: Vector3): Vector3 {
    const p = this._positionVelocity(this._clock())[0];
    return (out ?? new Vector3()).set(p[0], p[1], p[2]);
  }

  // Read the current velocity into an existing Vector3 (or create one)
  getVelocity3(out?: Vector3): Vector3 {
    const p = this._positionVelocity(this._clock())[1];
    return (out ?? new Vector3()).set(p[0], p[1], p[2]);
  }

  // Read the target as a Vector3
  getTarget3(out?: Vector3): Vector3 {
    const t = this._target;
    return (out ?? new Vector3()).set(t[0], t[1], t[2]);
  }

  setPosition3(v: Vector3): void {
    this.position = [v.x, v.y, v.z];
  }

  setVelocity3(v: Vector3): void {
    this.velocity = [v.x, v.y, v.z];
  }

  setTarget3(v: Vector3): void {
    this.target = [v.x, v.y, v.z];
  }

  // -- Methods --

  // Apply an instantaneous impulse to the velocity
  impulse(velocity: number[]): void {
    const currentVelocity = this.velocity;
    for (let i = 0; i < this._dimensions; i++) {
      currentVelocity[i] += velocity[i];
    }
    this.velocity = currentVelocity;
  }

  impulse3(velocity: Vector3): void {
    this.impulse([velocity.x, velocity.y, velocity.z]);
  }

  // Skip forward in time by `delta` seconds without moving the clock.
  // Useful for fast-forwarding the spring to a future state.
  timeSkip(delta: number): void {
    const now = this._clock();
    const [position, velocity] = this._positionVelocity(now + delta);
    this._position0 = position;
    this._velocity0 = velocity;
    this._time0 = now;
  }

  // Set the target, optionally teleporting the spring there instantly
  setTarget(value: number[], doNotAnimate?: boolean): void {
    if (doNotAnimate) {
      const now = this._clock();
      this._position0 = [...value];
      this._velocity0 = new Array(this._dimensions).fill(0);
      this._target = [...value];
      this._time0 = now;
    } else {
      this.target = value;
    }
  }

  setTarget3NoAnimate(value: Vector3): void {
    this.setTarget([value.x, value.y, value.z], true);
  }
}
