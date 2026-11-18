import * as T from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';

// World geometry and lights stay on layer 0. Only the mirror cameras also
// render this layer, so the body cannot obscure the main view or intercept E.
export const MIRROR_GUEST_LAYER = 1;

export function createMirrorGuest(scene, manager) {
  const guest = new T.Group();
  guest.name = 'Reflected hotel guest';
  guest.visible = false;
  scene.add(guest);
  const left = new T.Vector3(), right = new T.Vector3(), last = new T.Vector2();
  const headAxis = new T.Vector3(), headFrame = new T.Quaternion();
  const gaze = new T.Quaternion(), animatedHead = new T.Quaternion();
  let mixer, actions, leftEye, rightEye, head, placed = false, gait = 0;

  new GLTFLoader(manager).load('./assets/models/mirror-guest.glb', ({scene:model,animations}) => {
    model.scale.setScalar(1.62 / 1.686);
    model.traverse(node => {
      node.layers.set(MIRROR_GUEST_LAYER);
      if (node.isMesh) node.receiveShadow = true;
    });
    guest.add(model);
    leftEye = model.getObjectByName('Bip01_LEye');
    rightEye = model.getObjectByName('Bip01_REye');
    head = model.getObjectByName('Bip01_Head');
    animatedHead.copy(head.quaternion);
    mixer = new T.AnimationMixer(model);
    actions = Object.fromEntries(animations.map(clip => [clip.name,mixer.clipAction(clip).play()]));
  });

  return function updateGuest(active, eye, yaw, pitch, floorY, dt) {
    guest.visible = active && !!mixer;
    if (!guest.visible) { placed = false; return; }
    const distance = Math.hypot(eye.x-last.x,eye.z-last.y);
    const speed = placed && distance < .4 && dt > 0 ? distance/dt : 0;
    last.set(eye.x,eye.z);
    placed = true;
    gait = T.MathUtils.damp(gait,Math.min(speed/1.3,1),12,dt);
    const low = 1 - T.MathUtils.smoothstep(eye.y-floorY,.56,1.62);
    actions.Stand.weight = (1-low)*(1-gait);
    actions.Walk.weight = (1-low)*gait;
    actions.Crouch.weight = low*(1-gait);
    actions.CrouchWalk.weight = low*gait;
    mixer.update(dt*(.7+.4*gait));
    guest.rotation.y = yaw + Math.PI;
    guest.position.copy(eye);
    head.parent.getWorldQuaternion(headFrame);
    headAxis.set(Math.cos(yaw),0,-Math.sin(yaw)).applyQuaternion(headFrame.invert());
    head.quaternion.copy(animatedHead).premultiply(gaze.setFromAxisAngle(headAxis,T.MathUtils.clamp(pitch,-.72,.65)*.75));
    leftEye.getWorldPosition(left);
    rightEye.getWorldPosition(right);
    // Place the midpoint of the actual eyes at the first-person viewpoint.
    // This also handles the forward lean of the crouched pose.
    guest.position.add(left.lerp(right,.5).sub(eye).negate());
  };
}
