import * as T from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';

// Only mirror cameras include this layer. The player model stays clear of the
// first-person view and does not intercept the interaction ray.
export const MIRROR_GUEST_LAYER = 1;

const GUESTS = {
  male: {file: 'mirror-guest.glb', eyeHeight: 1.686},
  female: {file: 'mirror-guest-female.glb', eyeHeight: 1.612},
};

export function createMirrorGuest(scene, manager) {
  const guest = new T.Group();
  guest.name = 'Reflected hotel guest';
  guest.visible = false;
  scene.add(guest);

  const loader = new GLTFLoader(manager);
  const variants = new Map();
  const left = new T.Vector3(), right = new T.Vector3(), last = new T.Vector2();
  const headAxis = new T.Vector3(), headFrame = new T.Quaternion();
  const gaze = new T.Quaternion();
  let current, placed = false, gait = 0;

  for (const [id, {file, eyeHeight}] of Object.entries(GUESTS)) {
    loader.load('./assets/models/' + file, ({scene:model, animations}) => {
      model.name = id;
      model.scale.setScalar(1.62 / eyeHeight);
      model.visible = false;
      model.traverse(node => {
        node.layers.set(MIRROR_GUEST_LAYER);
        if (node.isMesh) node.receiveShadow = true;
      });
      guest.add(model);
      const head = model.getObjectByName('Bip01_Head');
      const mixer = new T.AnimationMixer(model);
      variants.set(id, {
        model, mixer, head,
        leftEye: model.getObjectByName('Bip01_LEye'),
        rightEye: model.getObjectByName('Bip01_REye'),
        headRest: head.quaternion.clone(),
        actions: Object.fromEntries(animations.map(clip => [clip.name, mixer.clipAction(clip).play()])),
      });
    });
  }

  return function updateGuest(active, eye, yaw, pitch, floorY, dt, appearance = 'male') {
    const variant = variants.get(appearance) ?? variants.get('male') ?? variants.get('female');
    guest.visible = active && !!variant;
    if (!guest.visible) {
      placed = false;
      return;
    }
    if (variant !== current) {
      if (current) current.model.visible = false;
      current = variant;
      current.model.visible = true;
      placed = false;
      gait = 0;
    }

    const {actions, mixer, head, headRest, leftEye, rightEye} = current;
    const distance = Math.hypot(eye.x-last.x, eye.z-last.y);
    const speed = placed && distance < .4 && dt > 0 ? distance/dt : 0;
    last.set(eye.x, eye.z);
    placed = true;
    gait = T.MathUtils.damp(gait, Math.min(speed/1.3,1), 12, dt);
    const low = 1 - T.MathUtils.smoothstep(eye.y-floorY, .56, 1.62);
    actions.Stand.weight = (1-low)*(1-gait);
    actions.Walk.weight = (1-low)*gait;
    actions.Crouch.weight = low*(1-gait);
    actions.CrouchWalk.weight = low*gait;
    mixer.update(dt*(.7+.4*gait));
    guest.rotation.y = yaw + Math.PI;
    guest.position.copy(eye);
    head.parent.getWorldQuaternion(headFrame);
    headAxis.set(Math.cos(yaw), 0, -Math.sin(yaw)).applyQuaternion(headFrame.invert());
    head.quaternion.copy(headRest).premultiply(gaze.setFromAxisAngle(headAxis, T.MathUtils.clamp(pitch,-.72,.65)*.75));
    leftEye.getWorldPosition(left);
    rightEye.getWorldPosition(right);
    // Keep the eyes on the camera even when the crouch pose leans forward.
    guest.position.add(left.lerp(right,.5).sub(eye).negate());
  };
}
