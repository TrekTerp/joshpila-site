"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type InteractionTarget = "cooking" | "cocktails" | "backstory" | "advent" | "recipes" | `year-${number}` | null;
type MotionStudySceneProps = {
  concept: "anchorage" | "cabinet";
  phase: number;
  quiet: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  activeTarget: InteractionTarget;
  onCabinetReady: (ready: boolean) => void;
  onAnchorageReady: (ready: boolean) => void;
};

function makeGasTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#2a1015"); gradient.addColorStop(0.18, "#9b3e37"); gradient.addColorStop(0.37, "#d37c42"); gradient.addColorStop(0.52, "#542022"); gradient.addColorStop(0.7, "#c15d3f"); gradient.addColorStop(0.84, "#4a1822"); gradient.addColorStop(1, "#190b12");
  context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 7) {
    const wave = Math.sin(y * 0.071) * 16 + Math.sin(y * 0.019) * 23;
    const alpha = 0.05 + (Math.sin(y * 0.043) + 1) * 0.035;
    context.strokeStyle = `rgba(255, 202, 128, ${alpha})`; context.lineWidth = 2 + (y % 19) * 0.08; context.beginPath(); context.moveTo(-40, y);
    for (let x = 0; x <= canvas.width + 40; x += 18) context.lineTo(x, y + Math.sin(x * 0.018 + y * 0.012) * 5 + wave * Math.sin(x * 0.002));
    context.stroke();
  }
  const storm = context.createRadialGradient(650, 328, 3, 650, 328, 85);
  storm.addColorStop(0, "rgba(255, 190, 118, .72)"); storm.addColorStop(0.38, "rgba(151, 58, 48, .55)"); storm.addColorStop(1, "rgba(55, 19, 26, 0)"); context.fillStyle = storm; context.beginPath(); context.ellipse(650, 328, 90, 34, -0.12, 0, Math.PI * 2); context.fill();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.anisotropy = 4; return texture;
}

function makeWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#32180f"); gradient.addColorStop(0.18, "#754023"); gradient.addColorStop(0.5, "#9b6032"); gradient.addColorStop(0.82, "#62321c"); gradient.addColorStop(1, "#28120c");
  context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < canvas.width; x += 5) {
    const alpha = 0.025 + (Math.sin(x * 0.077) + 1) * 0.018;
    context.strokeStyle = `rgba(29, 10, 5, ${alpha})`; context.lineWidth = 1 + (x % 13) * 0.06; context.beginPath(); context.moveTo(x, -10);
    for (let y = 0; y <= canvas.height + 10; y += 18) context.lineTo(x + Math.sin(y * 0.025 + x * 0.012) * 5, y);
    context.stroke();
  }
  for (let x = 0; x <= canvas.width; x += 128) { context.fillStyle = "rgba(20, 8, 5, .34)"; context.fillRect(x, 0, 3, canvas.height); context.fillStyle = "rgba(232, 164, 92, .12)"; context.fillRect(x + 4, 0, 1, canvas.height); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.anisotropy = 4; return texture;
}

function halfCircle(side: "left" | "right", radius: number) {
  const shape = new THREE.Shape();
  if (side === "right") { shape.moveTo(0, -radius); shape.absarc(0, 0, radius, -Math.PI / 2, Math.PI / 2, false); shape.lineTo(0, -radius); }
  else { shape.moveTo(0, radius); shape.absarc(0, 0, radius, Math.PI / 2, Math.PI * 1.5, false); shape.lineTo(0, radius); }
  return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.025, bevelThickness: 0.02, curveSegments: 56 });
}

function makeStation(color: string) {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: "#fff2d3", transparent: true, opacity: 0.95, depthTest: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 30), ringMaterial);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), coreMaterial);
  group.add(ring, core);
  return { group, ringMaterial, coreMaterial };
}

export function MotionStudyScene({ concept, phase, quiet, overlayRef, activeTarget, onCabinetReady, onAnchorageReady }: MotionStudySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const quietRef = useRef(quiet);
  const activeTargetRef = useRef(activeTarget);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { quietRef.current = quiet; }, [quiet]);
  useEffect(() => { activeTargetRef.current = activeTarget; }, [activeTarget]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      mount.classList.add("webgl-unavailable");
      onCabinetReady(true);
      onAnchorageReady(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60); camera.position.set(0, 0, 9);
    scene.add(new THREE.HemisphereLight("#8fadc1", "#16090d", 1.25));
    const key = new THREE.DirectionalLight("#ffd7a0", 5.2); key.position.set(-4, 5, 6); scene.add(key);
    const rim = new THREE.PointLight("#dc708d", 16, 14, 2); rim.position.set(3, -1, 2); scene.add(rim);
    const cabinetGlow = new THREE.PointLight("#ffad52", 0, 6, 2); cabinetGlow.position.set(0.7, 0.1, 2.1);

    const world = new THREE.Group(); scene.add(world); world.add(cabinetGlow);
    const texture = makeGasTexture();
    const woodTexture = makeWoodTexture();
    const globeMaterial = new THREE.MeshStandardMaterial({ map: texture, color: "#ffffff", roughness: 0.68, metalness: 0.02, emissive: "#421521", emissiveIntensity: 0.28, transparent: true });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1.48, 80, 56), globeMaterial); world.add(globe);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({ color: "#e67890", transparent: true, opacity: 0.13, side: THREE.BackSide });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.53, 56, 40), atmosphereMaterial); world.add(atmosphere);

    const anchorObjects: Record<string, THREE.Object3D> = {};
    const anchorStations: Record<string, ReturnType<typeof makeStation>> = {};
    const anchorGroup = new THREE.Group(); anchorGroup.visible = concept === "anchorage"; world.add(anchorGroup);
    const stationColors: Record<string, string> = { cooking: "#d2a660", cocktails: "#dd7690", backstory: "#c99b68", advent: "#dd7690", recipes: "#a7c2c8" };
    ["cooking", "cocktails", "backstory", "advent", "recipes"].forEach((name) => {
      const station = makeStation(stationColors[name]); anchorStations[name] = station; anchorObjects[name] = station.group; anchorGroup.add(station.group);
    });
    const railMaterial = new THREE.LineBasicMaterial({ color: "#c58d66", transparent: true, opacity: 0, depthTest: false });
    const railGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 5 }, () => new THREE.Vector3()));
    const anchorRail = new THREE.Line(railGeometry, railMaterial); anchorRail.renderOrder = 3; anchorGroup.add(anchorRail);

    const cabinet = new THREE.Group(); cabinet.visible = concept === "cabinet"; world.add(cabinet);
    const shellMaterials: Array<{ material: THREE.Material & { opacity: number }; base: number }> = [];
    const interiorMaterials: Array<{ material: THREE.Material & { opacity: number }; base: number }> = [];
    const makeStandard = (bucket: typeof shellMaterials, base: number, options: THREE.MeshStandardMaterialParameters) => { const material = new THREE.MeshStandardMaterial({ ...options, transparent: true, opacity: 0, depthWrite: false }); bucket.push({ material, base }); return material; };
    const makePhysical = (bucket: typeof shellMaterials, base: number, options: THREE.MeshPhysicalMaterialParameters) => { const material = new THREE.MeshPhysicalMaterial({ ...options, transparent: true, opacity: 0, depthWrite: false }); bucket.push({ material, base }); return material; };
    const leftDoorWood = makeStandard(shellMaterials, 1, { map: woodTexture, color: "#85502f", roughness: 0.72, metalness: 0.02, emissive: "#251008", emissiveIntensity: 0.16, side: THREE.DoubleSide });
    const rightDoorWood = makeStandard(shellMaterials, 1, { map: woodTexture, color: "#85502f", roughness: 0.72, metalness: 0.02, emissive: "#251008", emissiveIntensity: 0.16, side: THREE.DoubleSide });
    const barrelWood = makeStandard(shellMaterials, 1, { map: woodTexture, color: "#5d321e", roughness: 0.8, emissive: "#1d0c07", emissiveIntensity: 0.14 });
    const iron = makeStandard(shellMaterials, 1, { color: "#24282a", roughness: 0.31, metalness: 0.88 });
    const brass = makeStandard(shellMaterials, 1, { color: "#9b7040", roughness: 0.38, metalness: 0.72 });
    const darkWood = makeStandard(interiorMaterials, 1, { color: "#120907", roughness: 0.88, emissive: "#0b0302", emissiveIntensity: 0.12 });
    const shelfWood = makeStandard(interiorMaterials, 1, { map: woodTexture, color: "#81502b", roughness: 0.7, emissive: "#2b1007", emissiveIntensity: 0.14 });
    const paper = makeStandard(interiorMaterials, 1, { color: "#c8aa72", roughness: 0.9 });
    const glass = makePhysical(interiorMaterials, 0.6, { color: "#b8d1d2", roughness: 0.08, metalness: 0.05, transmission: 0.35 });
    const amber = makePhysical(interiorMaterials, 0.94, { color: "#9d3f16", roughness: 0.24, metalness: 0.08, transmission: 0.08 });

    const barrelBack = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.42, 72), barrelWood); barrelBack.rotation.x = Math.PI / 2; barrelBack.position.z = -0.14; cabinet.add(barrelBack);
    const interior = new THREE.Mesh(new THREE.CircleGeometry(1.39, 72), darkWood); interior.position.z = 0.035; cabinet.add(interior);
    const barrelRim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.055, 10, 96), iron); barrelRim.position.z = 0.2; barrelRim.scale.y = 0.98; cabinet.add(barrelRim);
    const centerSeam = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.78, 0.055), iron); centerSeam.position.set(0, 0, 0.37); cabinet.add(centerSeam);

    const leftPivot = new THREE.Group(); leftPivot.position.x = -1.48; cabinet.add(leftPivot);
    const rightPivot = new THREE.Group(); rightPivot.position.set(1.48, 0, 0.3); cabinet.add(rightPivot);
    const leftDoor = new THREE.Mesh(halfCircle("left", 1.46), leftDoorWood); leftDoor.position.set(1.48, 0, 0.22); leftPivot.add(leftDoor);
    const rightDoor = new THREE.Mesh(halfCircle("right", 1.46), rightDoorWood); rightDoor.position.set(-1.48, 0, -0.08); rightPivot.add(rightDoor);
    [-0.78, 0.78].forEach((y) => {
      const halfWidth = Math.sqrt(1.42 ** 2 - y ** 2);
      const bandCenter = 1.48 - halfWidth / 2;
      const leftBand = new THREE.Mesh(new THREE.BoxGeometry(halfWidth, 0.045, 0.085), iron); leftBand.position.set(bandCenter, y, 0.36); leftPivot.add(leftBand);
      const rightBand = new THREE.Mesh(new THREE.BoxGeometry(halfWidth, 0.045, 0.085), iron); rightBand.position.set(-bandCenter, y, 0.06); rightPivot.add(rightBand);
    });
    [0.3, 0.62, 0.94, 1.24].forEach((x) => {
      const leftX = x - 1.48; const heightAtX = Math.max(0.5, 2 * Math.sqrt(Math.max(0, 1.4 ** 2 - leftX ** 2)));
      const leftSeam = new THREE.Mesh(new THREE.BoxGeometry(0.018, heightAtX, 0.035), brass); leftSeam.position.set(x, 0, 0.37); leftPivot.add(leftSeam);
      const rightSeam = new THREE.Mesh(new THREE.BoxGeometry(0.018, heightAtX, 0.035), brass); rightSeam.position.set(-x, 0, 0.07); rightPivot.add(rightSeam);
    });
    [-0.78, 0, 0.78].forEach((y) => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.26, 16), iron); hinge.position.set(1.48, y, 0.3); cabinet.add(hinge);
      const bodyLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.11, 0.055), iron); bodyLeaf.position.set(1.35, y, 0.29); cabinet.add(bodyLeaf);
      const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.11, 0.055), iron); doorLeaf.position.set(-0.13, y, 0); rightPivot.add(doorLeaf);
    });
    [-0.62, 0, 0.62].forEach((y) => { const innerRail = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.055, 0.07), brass); innerRail.position.set(-0.72, y, -0.14); rightPivot.add(innerRail); });
    const leftHandle = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 7, 24, Math.PI), iron); leftHandle.position.set(1.31, 0, 0.43); leftHandle.rotation.z = Math.PI / 2; leftPivot.add(leftHandle);
    const rightHandle = leftHandle.clone(); rightHandle.position.set(-1.31, 0, 0.13); rightPivot.add(rightHandle);
    const leftDoorAnchor = new THREE.Object3D(); leftDoorAnchor.position.set(0.72, 0, 0.46); leftPivot.add(leftDoorAnchor); anchorObjects.cooking = concept === "cabinet" ? leftDoorAnchor : anchorObjects.cooking;
    const rightDoorAnchor = new THREE.Object3D(); rightDoorAnchor.position.set(-0.72, 0, 0.16); rightPivot.add(rightDoorAnchor); anchorObjects.cocktails = concept === "cabinet" ? rightDoorAnchor : anchorObjects.cocktails;

    const rightInterior = new THREE.Group(); cabinet.add(rightInterior);
    const shelfGroups: Record<string, THREE.Group> = {};
    const shelfYs: Record<string, number> = { backstory: 0.48, advent: -0.1, recipes: -0.68 };
    Object.entries(shelfYs).forEach(([name, y]) => {
      const group = new THREE.Group(); shelfGroups[name] = group; rightInterior.add(group);
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.27, 0.085, 0.36), shelfWood); shelf.position.set(0.72, y, 0.13); group.add(shelf);
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.07), iron); fascia.position.set(0.72, y - 0.015, 0.18); group.add(fascia);
      const anchor = new THREE.Object3D(); anchor.position.set(0.12, y - 0.065, 0.25); cabinet.add(anchor); anchorObjects[name] = anchor;
      const endAnchor = new THREE.Object3D(); endAnchor.position.set(1.34, y - 0.065, 0.25); cabinet.add(endAnchor); anchorObjects[`${name}-end`] = endAnchor;
      const outputAnchor = new THREE.Object3D(); outputAnchor.position.set(0.03, y, 0.32); rightPivot.add(outputAnchor); anchorObjects[`workspace-${name}`] = outputAnchor;
    });

    const books = new THREE.Group(); books.position.set(0.38, 0.53, 0.2); shelfGroups.backstory.add(books);
    [0.28, 0.34, 0.24, 0.31].forEach((height, index) => { const book = new THREE.Mesh(new THREE.BoxGeometry(0.14, height, 0.24), index % 2 ? paper : shelfWood); book.position.set(index * 0.18, height / 2, 0); book.rotation.z = index === 3 ? -0.13 : 0; books.add(book); });
    const glassware = new THREE.Group(); glassware.position.set(0.14, 0.09, 0.2); shelfGroups.advent.add(glassware);
    const glassMeshes: THREE.Mesh[] = [];
    const yearAnchors: THREE.Object3D[] = [];
    for (let index = 0; index < 6; index += 1) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, 0.28, 18, 1, true), glass); cup.position.set(index * 0.205, 0, 0); glassware.add(cup); glassMeshes.push(cup);
      const anchor = new THREE.Object3D(); anchor.position.set(index * 0.205, -0.17, 0.14); glassware.add(anchor); yearAnchors.push(anchor); anchorObjects[`year-${2020 + index}`] = anchor;
    }
    const yearRailAnchor = new THREE.Object3D(); yearRailAnchor.position.set(0.72, -1.16, 0.25); cabinet.add(yearRailAnchor); anchorObjects["year-rail"] = yearRailAnchor;
    const bottles = new THREE.Group(); bottles.position.set(0.26, -0.63, 0.2); shelfGroups.recipes.add(bottles);
    for (let index = 0; index < 5; index += 1) { const bottle = new THREE.Group(); const bodyHeight = 0.31 + (index % 3) * 0.045; const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085 + (index % 2) * 0.018, 0.11, bodyHeight, 16), amber); body.position.y = bodyHeight / 2; bottle.add(body); const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.13, 12), amber); neck.position.y = bodyHeight + 0.04; bottle.add(neck); bottle.position.x = index * 0.23; bottles.add(bottle); }
    const cabinetTrayAnchor = new THREE.Object3D(); cabinetTrayAnchor.position.set(0.03, 0.8, 0.32); rightPivot.add(cabinetTrayAnchor); anchorObjects.cabinet = cabinetTrayAnchor;
    const cabinetCenterAnchor = new THREE.Object3D(); cabinetCenterAnchor.position.set(0, 0, 0.24); cabinet.add(cabinetCenterAnchor); anchorObjects["cabinet-center"] = cabinetCenterAnchor;

    const systemRig = new THREE.Group();
    const armMaterial = new THREE.MeshBasicMaterial({ color: "#88683b", transparent: true, opacity: 0.62 });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.025, 0.025), armMaterial); arm.position.set(-2.8, -0.72, -0.6); arm.rotation.z = 0.11; systemRig.add(arm);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: "#7b633e", transparent: true, opacity: 0.44 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.018, 6, 160), ringMaterial); ring.scale.y = 0.46; ring.position.set(-2.2, -0.75, -1.2); ring.rotation.z = -0.08; systemRig.add(ring); scene.add(systemRig);

    let width = 0; let height = 0;
    const resize = () => { width = Math.max(1, mount.clientWidth); height = Math.max(1, mount.clientHeight); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    let currentScale = 0.42; let currentX = 1.85; let currentY = 0.05; let currentRigOpacity = 1; let currentMorph = 0; let currentDoor = 0; let currentBranch = 0; let currentRotation = 0; let animationFrame = 0; let previous = performance.now(); let reportedReady = false; let reportedBranchReady = false;
    const projected = new THREE.Vector3();
    const projectAnchor = (name: string, object: THREE.Object3D) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      object.getWorldPosition(projected); projected.project(camera);
      overlay.style.setProperty(`--${name}-x`, `${(projected.x * 0.5 + 0.5) * width}px`);
      overlay.style.setProperty(`--${name}-y`, `${(-projected.y * 0.5 + 0.5) * height}px`);
    };
    const setStationPosition = (name: string, target: THREE.Vector3, rate: number) => anchorStations[name].group.position.lerp(target, rate);
    const stationInitial: Record<string, THREE.Vector3> = {
      cooking: new THREE.Vector3(1.05, 0.62, 0.9), cocktails: new THREE.Vector3(1.17, -0.28, 0.92),
      backstory: new THREE.Vector3(1.21, -0.12, 0.9), advent: new THREE.Vector3(1.08, -0.52, 0.94), recipes: new THREE.Vector3(0.82, -0.86, 0.98),
    };
    const stationExpanded: Record<string, THREE.Vector3> = {
      cooking: new THREE.Vector3(0.78, 1.16, 0.96), cocktails: new THREE.Vector3(1.18, 0.55, 0.94),
      backstory: new THREE.Vector3(1.24, 0, 0.9), advent: new THREE.Vector3(1.08, -0.58, 0.94), recipes: new THREE.Vector3(0.7, -1.16, 0.98),
    };

    const render = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000); previous = now;
      const activePhase = phaseRef.current; const compact = width < 900; const constrained = width < 1200 || height < 700; const arrived = activePhase >= 2;
      const verticalSpan = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const worldPerPx = verticalSpan / height; const wideSpatial = width >= 1200 && height >= 650; const pad = compact ? 24 : wideSpatial ? 48 : 32;
      const workspaceMinimum = wideSpatial ? 520 : 400;
      const usableWidth = concept === "cabinet" && !compact ? Math.min(width * 0.56, width - workspaceMinimum - 3 * pad) : compact ? width - 2 * pad : width * 0.43;
      const usableHeight = height - 2 * pad; const designScale = concept === "anchorage" ? 1.62 : 1.27;
      const objectWidth = concept === "cabinet" && activePhase >= 3 ? 4.8 : 3.15; const objectHeight = 3.18;
      const scaleFloor = compact ? 0.24 : constrained ? 0.5 : 0.72;
      const fittedScale = Math.max(scaleFloor, Math.min(designScale, usableWidth * worldPerPx / objectWidth, usableHeight * worldPerPx / objectHeight) * 0.96);
      const targetScale = activePhase === 0 ? Math.min(0.42, fittedScale) : activePhase === 1 ? Math.min(1.18, fittedScale) : fittedScale;
      const visibleWidth = verticalSpan * (width / height); const targetCenter = compact ? 0.5 : concept === "anchorage" ? 0.1 : constrained ? 0.31 : 0.35;
      const spatialX = (targetCenter - 0.5) * visibleWidth;
      const targetX = activePhase === 0 ? (compact ? 0.85 : 1.85) : spatialX;
      const targetY = activePhase === 0 ? 0.05 : compact ? 0.68 : concept === "cabinet" ? 0.04 : 0;
      const targetRigOpacity = activePhase === 0 ? 1 : activePhase === 1 ? 0.22 : 0;
      const targetMorph = concept === "cabinet" && arrived ? 1 : 0;
      const targetDoor = concept === "cabinet" && activePhase >= 3 ? 1 : 0;
      const targetBranch = concept === "anchorage" && activePhase >= 3 ? 1 : 0;
      const rate = quietRef.current ? 1 : 1 - Math.pow(0.0009, delta);
      currentScale = THREE.MathUtils.lerp(currentScale, targetScale, rate); currentX = THREE.MathUtils.lerp(currentX, targetX, rate); currentY = THREE.MathUtils.lerp(currentY, targetY, rate); currentRigOpacity = THREE.MathUtils.lerp(currentRigOpacity, targetRigOpacity, rate); currentMorph = THREE.MathUtils.lerp(currentMorph, targetMorph, rate); currentDoor = THREE.MathUtils.lerp(currentDoor, targetDoor, rate); currentBranch = THREE.MathUtils.lerp(currentBranch, targetBranch, rate);
      if (!arrived) currentRotation += quietRef.current ? 0 : delta * 0.12; else currentRotation = THREE.MathUtils.lerp(currentRotation, concept === "anchorage" && activePhase >= 3 ? -0.13 : 0, rate);
      world.position.set(currentX, currentY, 0); world.scale.setScalar(currentScale); world.rotation.set(0, currentRotation, arrived ? -0.02 : 0.08);

      if (concept === "cabinet") {
        const planetCompression = 1 - currentMorph * 0.68;
        globe.scale.set(1, 1, planetCompression); atmosphere.scale.set(1, 1, planetCompression);
        globeMaterial.opacity = 1 - currentMorph; atmosphereMaterial.opacity = 0.13 * (1 - currentMorph);
        globe.visible = globeMaterial.opacity > 0.01; atmosphere.visible = atmosphereMaterial.opacity > 0.005;
        const cabinetDim = activePhase >= 6 ? 0.42 : 1;
        shellMaterials.forEach(({ material, base }) => {
          const opaqueFinal = currentMorph > 0.995 && cabinetDim === 1;
          if (material.transparent === opaqueFinal) { material.transparent = !opaqueFinal; material.depthWrite = opaqueFinal; material.needsUpdate = true; }
          material.opacity = opaqueFinal ? 1 : currentMorph * base * cabinetDim;
        });
        const interiorReveal = Math.max(0, Math.min(1, (currentDoor - 0.04) / 0.5));
        interiorMaterials.forEach(({ material, base }) => { material.opacity = currentMorph * interiorReveal * base * cabinetDim; });
        rightInterior.visible = currentDoor > 0.015;
        cabinet.visible = currentMorph > 0.01; cabinet.scale.setScalar(1); cabinet.rotation.y = -0.16 * currentMorph; cabinet.rotation.z = (1 - currentMorph) * 0.055;
        rightPivot.rotation.y = currentDoor * THREE.MathUtils.degToRad(120); centerSeam.visible = currentDoor < 0.98;
        rightDoorAnchor.position.x = THREE.MathUtils.lerp(-0.72, -0.84, currentDoor);
        rightDoorAnchor.position.y = THREE.MathUtils.lerp(0, 0.34, currentDoor);
        rightDoorAnchor.position.z = THREE.MathUtils.lerp(0.16, -0.1, currentDoor);
        leftDoorWood.emissiveIntensity = THREE.MathUtils.lerp(leftDoorWood.emissiveIntensity, activeTargetRef.current === "cooking" ? 0.62 : 0.24, rate);
        rightDoorWood.emissiveIntensity = THREE.MathUtils.lerp(rightDoorWood.emissiveIntensity, activeTargetRef.current === "cocktails" ? 0.62 : 0.24, rate);
        cabinetGlow.intensity = 8 * currentMorph * (0.2 + currentDoor * 0.8) * cabinetDim;
        const ready = currentDoor > 0.9;
        if (ready !== reportedReady) { reportedReady = ready; onCabinetReady(ready); }
        Object.entries(shelfGroups).forEach(([name, group]) => {
          const selected = activeTargetRef.current === name || (activePhase >= 4 && name === "advent");
          const target = selected ? 1.045 : 1; const current = group.scale.x;
          group.scale.setScalar(THREE.MathUtils.lerp(current, target, rate));
        });
        yearAnchors.forEach((_, index) => {
          const glassObject = glassMeshes[index];
          const selected = activeTargetRef.current === `year-${2020 + index}` || (activePhase >= 5 && index === 4);
          const target = selected ? 1.16 : 1; glassObject.scale.setScalar(THREE.MathUtils.lerp(glassObject.scale.x, target, rate));
        });
      } else {
        globeMaterial.opacity = activePhase >= 6 ? 0.62 : 1; atmosphereMaterial.opacity = activePhase >= 6 ? 0.07 : 0.13;
        const targetSet = currentBranch > 0.5 ? stationExpanded : stationInitial;
        Object.keys(anchorStations).forEach((name) => {
          setStationPosition(name, targetSet[name], rate);
          const child = name !== "cooking" && name !== "cocktails";
          const visibility = child ? currentBranch : 1;
          anchorStations[name].ringMaterial.opacity = visibility * (activeTargetRef.current === name ? 1 : 0.72);
          anchorStations[name].coreMaterial.opacity = visibility * (activeTargetRef.current === name ? 1 : 0.88);
          anchorStations[name].group.visible = visibility > 0.01;
          const selected = activeTargetRef.current === name || (activePhase >= 3 && name === "cocktails");
          const target = selected ? 1.35 : 1; anchorStations[name].group.scale.setScalar(THREE.MathUtils.lerp(anchorStations[name].group.scale.x, target, rate));
        });
        const railPositions = railGeometry.getAttribute("position") as THREE.BufferAttribute;
        ["cocktails", "backstory", "advent", "recipes", "recipes"].forEach((name, index) => {
          const p = anchorStations[name].group.position; railPositions.setXYZ(index, p.x, p.y, p.z - 0.03);
        });
        railPositions.needsUpdate = true; railMaterial.opacity = currentBranch * 0.62;
        const ready = currentBranch > 0.76;
        if (ready !== reportedBranchReady) { reportedBranchReady = ready; onAnchorageReady(ready); }
      }

      armMaterial.opacity = currentRigOpacity * 0.62; ringMaterial.opacity = currentRigOpacity * 0.44;
      camera.updateMatrixWorld(true); scene.updateMatrixWorld(true);
      Object.entries(anchorObjects).forEach(([name, object]) => projectAnchor(`anchor-${name}`, object));
      renderer.render(scene, camera); animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animationFrame); observer.disconnect(); onCabinetReady(false); onAnchorageReady(false); texture.dispose(); woodTexture.dispose(); scene.traverse((object) => { if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return; object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); }); renderer.dispose(); renderer.domElement.remove(); };
  }, [concept, onAnchorageReady, onCabinetReady, overlayRef]);
  return <div className="study-three-scene" ref={mountRef} aria-hidden="true" />;
}
