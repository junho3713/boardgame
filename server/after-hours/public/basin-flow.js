import * as T from './three.module.js';
import {BASIN_CENTER_X, BASIN_IMPACT, BASIN_OUTLET, basinSurface} from './basin-water.js';
export {BASIN_IMPACT, BASIN_OUTLET} from './basin-water.js';

const tau = Math.PI * 2;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const cosmetic = mesh => { mesh.raycast = () => {}; return mesh; };

function waterSurface(parent) {
  const radius = new T.Vector2();
  const time = {value: 0}, agitation = {value: 0}, whirl = {value: 0};
  const water = new T.MeshPhysicalMaterial({
    color: '#a2c4bc', metalness: .14, roughness: .085, clearcoat: 1,
    clearcoatRoughness: .12, envMapIntensity: 1.9, transparent: true, opacity: .63, depthWrite: false
  });
  water.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {bowlRadius: {value: radius}, waterTime: time, agitation, whirl});
    shader.vertexShader = 'varying vec2 disk;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n disk = position.xy;');
    shader.fragmentShader = 'varying vec2 disk; uniform vec2 bowlRadius; uniform float waterTime, agitation, whirl;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 p = vec2(disk.x, -disk.y) * bowlRadius;
      vec2 hit = p - vec2(.105, 0.);
      float dist = length(hit);
      float slope = sin(dist * 195. - waterTime * 21.) * exp(-dist * 9.) * agitation * .3;
      vec2 ripple = slope * hit / max(.004,dist);
      float edge = smoothstep(.90, 1., length(disk));
      ripple += disk * edge * .23;
      float drainWave = sin(length(p)*127. + waterTime*13. + p.x*9.) * whirl;
      ripple += .12 * drainWave * exp(-length(p)*12.) * vec2(-p.y,p.x) / max(.005,length(p));
      normal = normalize(normal + mat3(viewMatrix) * vec3(ripple.x, 0., ripple.y));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float fresnel = pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),3.0);
      diffuseColor.a += fresnel*.34 + edge*.15;
      outgoingLight += vec3(.6,.74,.71) * (.14*fresnel + .08*edge + .18*abs(slope));
      #include <opaque_fragment>
    `);
  };
  const disk = cosmetic(new T.Mesh(new T.CircleGeometry(1, 72), water));
  disk.rotation.x = -Math.PI / 2;
  disk.renderOrder = 2;
  parent.add(disk);
  return {disk, update(shape, volume, impact, draining, seconds) {
    disk.visible = volume > .00012;
    disk.position.set(BASIN_CENTER_X, shape.height + .0008, 0);
    radius.set(shape.rx, shape.rz);
    disk.scale.set(shape.rx * .998, shape.rz * .998, 1);
    time.value = seconds;
    agitation.value = impact;
    whirl.value = draining;
    water.opacity = .25 + .13 * Math.min(1, volume * 4);
  }};
}

function drainHardware(parent, state) {
  const metal = new T.MeshStandardMaterial({color: '#b8b6a5', metalness: .83, roughness: .23});
  const black = new T.MeshStandardMaterial({color: '#302f29', roughness: .55});
  function cylinder(radius, height, material, x, y, z, holder = parent) {
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, height, 32), material);
    mesh.position.set(x, y, z); holder.add(mesh); return mesh;
  }
  const cap = cylinder(.031, .009, metal, BASIN_CENTER_X, .739, 0);
  cylinder(.026, .003, black, 0, -.0055, 0, cap);
  const rod = new T.Group(); parent.add(rod); rod.position.set(.20, .95, .144);
  cylinder(.014, .006, metal, .20, .947, .144);
  cylinder(.004, .105, metal, 0, .009, 0, rod);
  cylinder(.022, .012, metal, 0, .063, 0, rod);
  const overflow = new T.Mesh(new T.CircleGeometry(1, 32), black);
  overflow.position.set(BASIN_CENTER_X + .208, .919, 0);
  overflow.rotation.y = -Math.PI / 2; overflow.scale.set(.034, .009, 1); parent.add(overflow);
  // The lift rod stays reachable even when the stopper is under water.
  function update(k) {
    cap.position.y += ((state.drainClosed ? .739 : .765) - cap.position.y) * k;
    rod.position.y += ((state.drainClosed ? .974 : .948) - rod.position.y) * k;
    const label = state.drainClosed ? '배수 마개 열기' : '배수 마개 닫기';
    for (const target of [cap, rod]) Object.assign(target.userData, {interactId: 'basinDrain', label});
  }
  update(1);
  return {cap, rod, update};
}

function fallingJet(parent) {
  const rows = 18, sides = 12;
  const geo = new T.PlaneGeometry(1, 1, sides, rows);
  const positions = geo.attributes.position;
  positions.setUsage(T.DynamicDrawUsage);
  const paint = new T.MeshPhysicalMaterial({color: '#c3e1da', roughness: .14, metalness: .16,
    clearcoat: 1, envMapIntensity: 2.2, transparent: true, opacity: .7, depthWrite: false, side: T.DoubleSide});
  const mesh = cosmetic(new T.Mesh(geo, paint));
  mesh.frustumCulled = false; mesh.renderOrder = 3; parent.add(mesh);
  return {mesh, update(top, bottom, flow, seconds) {
    mesh.visible = bottom < top - .002 && flow > .002;
    if (!mesh.visible) return;
    let idx = 0;
    for (let row = 0; row <= rows; row++) {
      const f = row / rows, y = top + (bottom - top) * f;
      const fall = BASIN_OUTLET[1] - y, phase = fall * 83 - seconds * 16;
      const r = .014 * Math.sqrt(flow) / Math.pow(1 + fall * 8, .25);
      for (let j = 0; j <= sides; j++) {
        const a = tau * j / sides;
        const radius = r * (1 + .10 * Math.sin(a * 3 + phase) + .06 * Math.sin(a * 5 - phase * 1.7));
        positions.setXYZ(idx++, BASIN_OUTLET[0] + Math.cos(a) * radius, y, Math.sin(a) * radius);
      }
    }
    positions.needsUpdate = true; geo.computeVertexNormals();
  }};
}

export function buildBasinFlow({parent, lever, state}) {
  const surface = waterSurface(parent), hardware = drainHardware(parent, state);
  const jet = fallingJet(parent);
  const splashMat = new T.MeshBasicMaterial({color: '#dceae5', transparent: true, opacity: .64, depthWrite: false});
  const spray = cosmetic(new T.InstancedMesh(new T.SphereGeometry(.0025, 6, 5), splashMat, 14));
  const drop = new T.Object3D(); spray.frustumCulled = false; spray.renderOrder = 4; parent.add(spray);
  const clothGeo = new T.PlaneGeometry(.15, .12, 10, 8), pos = clothGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 42) * .006 + Math.cos(pos.getY(i) * 28) * .004);
  clothGeo.computeVertexNormals();
  const cloth = new T.Mesh(clothGeo, new T.MeshStandardMaterial({color: '#93a99e', roughness: 1, side: T.DoubleSide}));
  Object.assign(cloth.userData, {interactId: 'basin', label: '물줄기에 천 적시는 중'});
  cloth.rotation.x = -Math.PI / 2; cloth.position.set(.055, 1.005, 0); parent.add(cloth);
  let time = 0, valve = 0, edgeAge = 4, shuttingFlow = 0, previous = false, turbulence = 0;
  const still = reducedMotion();
  return {surface: surface.disk, stream: jet.mesh, cap: hardware.cap, rod: hardware.rod, cloth, update(dt) {
    time += dt;
    const k = 1 - Math.exp(-dt * 10);
    if (state.faucetOn !== previous) { edgeAge = 0; shuttingFlow = valve; previous = state.faucetOn; }
    edgeAge += dt; valve += (Number(state.faucetOn) - valve) * k;
    lever.rotation.z = -.55 * valve;
    lever.rotation.y += ((state.faucetHot ? -.6 : 0) - lever.rotation.y) * k;
    hardware.update(k);
    const shape = basinSurface(state.basinVolume);
    cloth.visible = state.basinWetting && valve > .35;
    const hit = cloth.visible ? 1.015 : Math.max(BASIN_IMPACT[1], shape.height);
    const fall = .55 * edgeAge + 4.905 * edgeAge * edgeAge;
    const nozzle = BASIN_OUTLET[1], leadingEdge = Math.max(hit, nozzle - fall);
    const top = state.faucetOn ? nozzle : leadingEdge;
    const bottom = state.faucetOn ? leadingEdge : hit;
    const strength = state.faucetOn ? valve : shuttingFlow;
    jet.update(top, bottom, strength, still ? 0 : time);
    const impact = bottom <= hit + .001 && top > hit + .002 ? strength : 0;
    turbulence += ((cloth.visible ? 0 : impact) - turbulence) * (1 - Math.exp(-dt * 3.6));
    surface.update(shape, state.basinVolume, turbulence, Number(!state.drainClosed), still ? 0 : time);
    spray.visible = !still && impact > .2;
    if (spray.visible) {
      for (let i = 0; i < spray.count; i++) {
        const p = (time * (2.7 + i % 4 * .17) + i * .618) % 1, a = i * 2.399 + Math.floor(time * (2.7 + i % 4 * .17) + i * .618);
        const range = (.022 + (i % 5) * .007) * p;
        drop.position.set(.055 + Math.cos(a) * range, hit + .002 + 4 * p * (1 - p) * (.011 + i % 3 * .008), Math.sin(a) * range);
        drop.scale.setScalar(Math.max(.12, (1 - p) * impact)); drop.scale.y *= 1.45;
        drop.updateMatrix(); spray.setMatrixAt(i, drop.matrix);
      }
      spray.instanceMatrix.needsUpdate = true;
    }
    cloth.material.color.set(state.clothWet ? '#6e8a7b' : '#93a99e');
  }};
}
