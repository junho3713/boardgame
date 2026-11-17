const clamp = t => Math.max(0, Math.min(1, t));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };

// The lock state belongs to the puzzle. The handle, leaf and footprint share
// one travel clock, so an unlocked door still occupies its opening as it swings.
export function hingedDoor({leaf, handles = [], width, thickness, yaw = 0, swing, alongZ = false, solids, handleAxis = 'z', handleSign = 1}) {
  let progress = 0;
  const solid = {x: 0, z: 0, w: alongZ ? thickness : width, d: alongZ ? width : thickness, yaw};
  solids.push(solid);
  function footprint(angle) {
    const half = width / 2;
    solid.x = leaf.position.x + half * (alongZ ? Math.sin(angle) : Math.cos(angle));
    solid.z = leaf.position.z + half * (alongZ ? Math.cos(angle) : -Math.sin(angle));
    solid.yaw = angle;
  }
  function overlapsPlayer(player) {
    const c = Math.cos(solid.yaw), s = Math.sin(solid.yaw);
    const dx = player.x - solid.x, dz = player.z - solid.z;
    return Math.abs(c * dx - s * dz) < solid.w / 2 + .22 && Math.abs(s * dx + c * dz) < solid.d / 2 + .22;
  }
  footprint(yaw);
  return function update(open, dt, player) {
    const next = clamp(progress + (open ? 1 : -1) * dt / .93);
    const angle = yaw + swing * smooth((next - .14) / .86);
    const occupied = player && overlapsPlayer(player);
    footprint(angle);
    if (player && !occupied && overlapsPlayer(player)) { footprint(leaf.rotation.y); return; }
    progress = next;
    leaf.rotation.y = angle;
    const press = smooth(progress / .14) * (1 - smooth((progress - .19) / .24));
    for (const lever of handles) lever.rotation[handleAxis] = handleSign * .38 * press;
  };
}

export function buildHotelDoor({parent, width, kind, plaque, plaqueSide = -1, helpers, materials}) {
  const {rb, box, cyl, group, sign, rod} = helpers;
  const {wood, darkwood, brass, metal, dark} = materials;
  const fire = kind === 'fire', leaf = parent, half = width / 2;
  rb(width - .012, 2.64, .078, half, 1.33, 0, fire ? metal : darkwood, leaf, .009);
  const handles = [];
  for (const side of [-1, 1]) {
    if (!fire) {
      for (const [y,h] of [[.60,.85],[1.85,1.27]]) {
        rb(width - .25, h, .019, half, y, side*.044, darkwood, leaf, .006);
        rb(width - .31, h-.06, .018, half, y, side*.054, wood, leaf, .007);
      }
    } else {
      box(width-.08,.27,.008,half,.16,side*.042,metal,leaf);
    }
    const x = width - .145;
    rb(.067,.228,.014,x,1.05,side*.061, brass,leaf,.005);
    const axle = cyl(.023,.023,.049,x,1.092,side*.085,brass,leaf,20); axle.rotation.x = Math.PI/2;
    const lever = group(x,1.092,side*.105,leaf);
    rod([0,0,0],[-.133,.002,side*.009],.012,brass,lever);
    rod([-.133,.002,side*.009],[-.151,.002,0],.012,brass,lever);
    handles.push(lever);
    box(.009,.028,.003,x,.998,side*.070,dark,leaf);
  }
  for (const y of [.29,1.30,2.34]) cyl(.016,.016,.118,.006,y,.044,brass,leaf,16);
  if (plaque) {
    const w = fire ? .55 : .34;
    rb(w+.018,.164,.014,half,1.96,plaqueSide*.075,brass,leaf,.004);
    const face = sign(plaque,w,.145,0,0,0,plaqueSide>0?0:Math.PI);
    leaf.add(face); face.position.set(half,1.96,plaqueSide*.085);
  }
  return handles;
}
