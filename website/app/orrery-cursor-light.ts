import * as THREE from "three";

// A lamp above the mechanism, projected along the cursor ray. Its falloff lights
// nearby surfaces without washing out the rest of the night sky.
export function createOrreryCursorLight(surfaceHeight: number) {
  const light = new THREE.PointLight(0xffe6bf, 0, 12, 2);
  const surface = new THREE.Plane(new THREE.Vector3(0, 1, 0), -surfaceHeight);
  const ray = new THREE.Raycaster();
  const target = new THREE.Vector3();
  const towardCamera = new THREE.Vector3();
  let positioned = false;

  const update = (pointer: THREE.Vector2 | null, camera: THREE.PerspectiveCamera, delta: number, immediate: boolean) => {
    let active = false;
    if (pointer) {
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(surface, target)) {
        // Keep the light on the same screen ray, but in front of the planets.
        towardCamera.copy(camera.position).sub(target).normalize();
        target.addScaledVector(towardCamera, 3.2);
        const follow = immediate || !positioned ? 1 : 1 - Math.exp(-18 * delta);
        light.position.lerp(target, follow);
        positioned = true;
        active = true;
      }
    }
    const fade = immediate ? 1 : 1 - Math.exp(-10 * delta);
    light.intensity = THREE.MathUtils.lerp(light.intensity, active ? 58 : 0, fade);
    if (!active && light.intensity < 0.01) {
      light.intensity = 0;
      positioned = false;
    }
  };

  return { light, update };
}
