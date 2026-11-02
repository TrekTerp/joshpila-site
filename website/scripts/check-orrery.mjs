import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";

// Exercise the actual configuration and camera fitter without requiring a GPU.
const source = readFileSync(new URL("../app/orrery-scene.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("orrery-scene.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const initializers = new Map();
const visit = (node) => {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    initializers.set(node.name.text, node.initializer.getText(tree));
  }
  ts.forEachChild(node, visit);
};
visit(tree);
const transpile = (text) => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const context = vm.createContext({ THREE, assert });
const lightModule = { exports: {} };
vm.runInNewContext(transpile(readFileSync(new URL("../app/orrery-cursor-light.ts", import.meta.url), "utf8")), {
  exports: lightModule.exports,
  require: (name) => { assert.equal(name, "three"); return THREE; },
});
context.createOrreryCursorLight = lightModule.exports.createOrreryCursorLight;
for (const name of ["gearTotalTeeth", "gearCollarTeeth", "gearDriveTeeth", "sharedDriveSpeed", "gearedOrbitSpeeds", "worldConfigs", "eclipticRadius", "eclipticHeight", "worldCenterHeight", "gearLevels", "armHeights"]) {
  assert.ok(initializers.has(name), `${name} must remain available for the geometry check`);
  vm.runInContext(transpile(`const ${name} = ${initializers.get(name)};`), context);
}
vm.runInContext(`
assert.equal(worldConfigs.length, 7);
assert.equal(gearCollarTeeth.length, worldConfigs.length);
assert.equal(new Set(gearedOrbitSpeeds).size, worldConfigs.length);
worldConfigs.forEach((world, i) => {
  assert.ok(Number.isFinite(world.orbitSpeed) && world.orbitSpeed > 0);
  assert.equal(gearCollarTeeth[i] + gearDriveTeeth[i], gearTotalTeeth);
  assert.ok(gearDriveTeeth[i] < gearCollarTeeth[i], 'All pairs must reduce drive speed');
  assert.ok(worldCenterHeight - world.radius - armHeights[i] > 0, 'Every stem has positive length');
  if (i) {
    assert.ok(gearLevels[i] - gearLevels[i - 1] > 0.085, 'Gear layers must not intersect');
    assert.ok(world.orbit - worldConfigs[i - 1].orbit > world.radius + worldConfigs[i - 1].radius, 'Neighboring orbits must clear both bodies');
  }
});
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const system = new THREE.Group();
system.rotation.z = -0.045;
const mount = { dataset: {} };
`, context);
vm.runInContext(transpile(`const fitCamera = ${initializers.get("fitCamera")};`), context);
for (const [width, height] of [[1920, 950], [1363, 800], [1280, 620], [390, 650], [430, 750]]) {
  const gap = vm.runInContext(`camera.aspect = ${width / height}; fitCamera(${width}, ${height}); Number(mount.dataset.minEclipticGap)`, context);
  assert.ok(gap >= 24, `${width}×${height}: selected-world rail clearance ${gap}px is below 24px`);
  vm.runInContext(`
    const frustum${width} = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (let sample = 0; sample < 360; sample++) {
      const angle = sample * Math.PI / 180;
      assert.ok(frustum${width}.containsPoint(system.localToWorld(new THREE.Vector3(Math.cos(angle) * (eclipticRadius + 0.65), eclipticHeight, Math.sin(angle) * (eclipticRadius + 0.65)))), '${width}×${height}: case clipped by camera frustum');
      worldConfigs.forEach((world) => {
        const center = system.localToWorld(new THREE.Vector3(Math.cos(angle) * world.orbit, worldCenterHeight, Math.sin(angle) * world.orbit));
        assert.ok(frustum${width}.containsPoint(center), '${width}×${height}: world clipped by camera frustum');
        const cursor = center.clone().project(camera);
        const lamp = createOrreryCursorLight(worldCenterHeight);
        lamp.update(new THREE.Vector2(cursor.x, cursor.y), camera, 1 / 60, true);
        const projectedLamp = lamp.light.position.clone().project(camera);
        assert.ok(Math.hypot(projectedLamp.x - cursor.x, projectedLamp.y - cursor.y) < 1e-6, 'Lamp must align with the cursor at every camera size');
        assert.ok(lamp.light.position.y > center.y + world.radius, 'Lamp must illuminate the visible surface from above');
        assert.ok(lamp.light.intensity > 0 && lamp.light.position.distanceTo(center) < lamp.light.distance, 'Hovered planet must be within the lamp reach');
      });
    }
  `, context);
  console.log(`${width}×${height}: minimum selected-world rail clearance ${gap}px`);
}

vm.runInContext(`
  const pointer = new THREE.Vector2(0.3, -0.2);
  const slow = createOrreryCursorLight(worldCenterHeight);
  const fast = createOrreryCursorLight(worldCenterHeight);
  for (let i = 0; i < 60; i++) slow.update(pointer, camera, 1 / 60, false);
  for (let i = 0; i < 120; i++) fast.update(pointer, camera, 1 / 120, false);
  assert.ok(Math.abs(slow.light.intensity - fast.light.intensity) < 1e-8, 'Fade must be frame-rate independent');
  for (let i = 0; i < 120; i++) slow.update(null, camera, 1 / 60, false);
  assert.equal(slow.light.intensity, 0, 'Leaving the scene must extinguish the lamp');
  fast.update(null, camera, 0, true);
  assert.equal(fast.light.intensity, 0, 'Quiet motion must stop immediately');
`, context);
console.log("Cursor lamp: screen alignment, surface clearance, light reach, frame-rate independence, and fade-out pass.");

const dataSource = readFileSync(new URL("../app/data.ts", import.meta.url), "utf8");
const data = { exports: {} };
vm.runInNewContext(transpile(dataSource), data);
const { artifacts, artifactHref } = data.exports;
assert.equal(artifacts.length, 7);
assert.equal(artifactHref(artifacts.find((item) => item.id === "sky")), "/astronomy/");
assert.equal(artifactHref(artifacts.find((item) => item.id === "games")), "https://www.joshpila.com/games/");
assert.equal(artifactHref(artifacts.find((item) => item.id === "campaigns")), "https://www.joshpila.com/dnd/");
assert.equal(artifactHref(artifacts.find((item) => item.id === "workshop")), "/artifact/workshop");
assert.equal(artifactHref(artifacts.find((item) => item.id === "cocktails")), "/study/cabinet");
console.log("Seven complete gear pairs; distinct Games/Workshop; live destinations and Cabinet route pass.");
