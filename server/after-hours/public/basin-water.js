const clamp = value => Math.max(0, Math.min(1, value));
export const BASIN_CENTER_X = -.05;
export const BASIN_OUTLET = [.055, 1.188, 0];
export const BASIN_IMPACT = [.055, .756, 0];

// The inner rings of the Blender bowl, from the waste flange to the overflow.
const profile = [
  [.730, .029, .029], [.755, .105, .170], [.820, .165, .250],
  [.890, .200, .295], [.917, .2081, .3065]
];
const volumes = [0];
for (let i = 1; i < profile.length; i++) {
  const [y, x, z] = profile[i], [oldY, oldX, oldZ] = profile[i - 1];
  const midArea = (x + oldX) * (z + oldZ) / 4;
  volumes.push(volumes[i - 1] + Math.PI * (y - oldY) * (oldX * oldZ + 4 * midArea + x * z) / 6);
}
export function basinSurface(volume) {
  const target = clamp(volume) * volumes.at(-1);
  const i = Math.max(1, volumes.findIndex(v => v >= target));
  const [ay, ax, az] = profile[i - 1], [by, bx, bz] = profile[i];
  // Invert accumulated volume inside a tapered ring, where both radii vary linearly.
  const slice = (target - volumes[i - 1]) / (Math.PI * (by - ay));
  const dx = bx - ax, dz = bz - az;
  let t = (target - volumes[i - 1]) / (volumes[i] - volumes[i - 1]);
  for (let n = 0; n < 4; n++) {
    const integral = t * (ax * az + t * ((ax * dz + az * dx) / 2 + t * dx * dz / 3));
    t = clamp(t - (integral - slice) / ((ax + dx * t) * (az + dz * t)));
  }
  return {height: ay + (by - ay) * t, rx: ax + dx * t, rz: az + dz * t};
}

export function basinOutflow(state) {
  if (state.drainClosed) return state.basinVolume >= 1 && state.faucetOn ? .065 : 0;
  return Math.min(.22, 1.5 * Math.sqrt(state.basinVolume));
}

export function advanceBasin(state, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const supply = state.faucetOn ? .065 : 0;
  if (state.drainClosed) {
    state.basinVolume = clamp(state.basinVolume + supply * seconds);
    return;
  }
  // A running tap leaves a shallow puddle above the open waste. Approach that
  // equilibrium monotonically even after a slow frame or a restored checkpoint.
  const standing = (supply / 1.5) ** 2;
  const next = state.basinVolume + (supply - basinOutflow(state)) * seconds;
  state.basinVolume = clamp(state.basinVolume >= standing ? Math.max(standing, next) : Math.min(standing, next));
}
