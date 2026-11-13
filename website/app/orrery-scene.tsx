"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { artifacts, artifactHref, originArtifact, type Artifact } from "./data";
import type { PlanetDepartureFrame } from "./cabinet-transition";
import { createOrreryCursorLight } from "./orrery-cursor-light";
import { worldTextureUrl } from "./world-textures";

type OrrerySceneProps = {
  selectedId: string | null;
  quiet: boolean;
  onSelect: (item: Artifact) => void;
  onClear: () => void;
  onNavigate: (item: Artifact) => void;
  transitionActive?: boolean;
  onDepartureFrame?: (frame: PlanetDepartureFrame) => void;
};

type WorldStyle = "ocean" | "atlas" | "lattice" | "archive" | "gas" | "forge" | "arcade";

type WorldConfig = {
  style: WorldStyle;
  radius: number;
  orbit: number;
  orbitSpeed: number;
  spinSpeed: number;
  phase: number;
  tilt: number;
  atmosphere: string;
};

type SurfaceResponse = {
  emissive: string;
  restingGlow: number;
  selectedGlow: number;
  recededGlow: number;
  roughness: number;
  metalness: number;
  bumpScale: number;
};

const surfaceResponses: Record<WorldStyle, SurfaceResponse> = {
  ocean: { emissive: "#26333d", restingGlow: 0.24, selectedGlow: 0.46, recededGlow: 0.14, roughness: 0.66, metalness: 0.02, bumpScale: 0 },
  atlas: { emissive: "#26333d", restingGlow: 0.24, selectedGlow: 0.46, recededGlow: 0.14, roughness: 0.66, metalness: 0.02, bumpScale: 0 },
  lattice: { emissive: "#7bbbc2", restingGlow: 0.42, selectedGlow: 0.66, recededGlow: 0.22, roughness: 0.5, metalness: 0.12, bumpScale: 0.08 },
  archive: { emissive: "#9a8566", restingGlow: 0.34, selectedGlow: 0.56, recededGlow: 0.19, roughness: 0.78, metalness: 0.01, bumpScale: 0.045 },
  gas: { emissive: "#26333d", restingGlow: 0.24, selectedGlow: 0.46, recededGlow: 0.14, roughness: 0.8, metalness: 0.02, bumpScale: 0 },
  forge: { emissive: "#a85991", restingGlow: 0.43, selectedGlow: 0.68, recededGlow: 0.23, roughness: 0.58, metalness: 0.05, bumpScale: 0.07 },
  arcade: { emissive: "#71b861", restingGlow: 0.48, selectedGlow: 0.72, recededGlow: 0.26, roughness: 0.54, metalness: 0.09, bumpScale: 0.035 },
};

const gearTotalTeeth = 96;
const gearCollarTeeth = [54, 60, 66, 72, 78, 84, 88];
const gearDriveTeeth = gearCollarTeeth.map((teeth) => gearTotalTeeth - teeth);
const sharedDriveSpeed = 0.145;
const gearedOrbitSpeeds = gearCollarTeeth.map((teeth, index) => sharedDriveSpeed * gearDriveTeeth[index] / teeth);

const worldConfigs: WorldConfig[] = [
  { style: "ocean", radius: 0.4, orbit: 1.9, orbitSpeed: gearedOrbitSpeeds[0], spinSpeed: 0.19, phase: 1.227, tilt: 0.16, atmosphere: "#79d8ff" },
  { style: "atlas", radius: 0.53, orbit: 3.15, orbitSpeed: gearedOrbitSpeeds[1], spinSpeed: 0.12, phase: 3.321, tilt: -0.12, atmosphere: "#f0a26e" },
  { style: "lattice", radius: 0.43, orbit: 4.48, orbitSpeed: gearedOrbitSpeeds[2], spinSpeed: 0.24, phase: 5.415, tilt: 0.28, atmosphere: "#f0c866" },
  { style: "archive", radius: 0.36, orbit: 5.86, orbitSpeed: gearedOrbitSpeeds[3], spinSpeed: 0.15, phase: 0.18, tilt: -0.22, atmosphere: "#d8bd8c" },
  { style: "gas", radius: 0.66, orbit: 7.3, orbitSpeed: gearedOrbitSpeeds[4], spinSpeed: 0.1, phase: 2.274, tilt: 0.08, atmosphere: "#ff8aa2" },
  { style: "forge", radius: 0.48, orbit: 8.6, orbitSpeed: gearedOrbitSpeeds[5], spinSpeed: 0.28, phase: 4.368, tilt: 0.36, atmosphere: "#bc98ff" },
  { style: "arcade", radius: 0.52, orbit: 9.9, orbitSpeed: gearedOrbitSpeeds[6], spinSpeed: 0.17, phase: 0.95, tilt: -0.18, atmosphere: "#9bdf83" },
];

const sunVertexShader = `
  varying vec3 vObjectPosition;
  varying vec3 vViewNormal;
  void main() {
    vObjectPosition = normalize(position);
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float uTime;
  varying vec3 vObjectPosition;
  varying vec3 vViewNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      amplitude *= 0.5;
    }
    return value;
  }

  float surfaceNoise(vec3 p, float scale, float timeOffset) {
    vec3 q = normalize(p) * scale;
    return (
      fbm(q.xy + vec2(timeOffset, 3.7)) +
      fbm(q.yz + vec2(11.3, timeOffset * 0.83)) +
      fbm(q.zx + vec2(timeOffset * 1.17, 23.9))
    ) / 3.0;
  }

  void main() {
    float broad = surfaceNoise(vObjectPosition, 4.8, uTime * 0.018);
    float cells = surfaceNoise(vObjectPosition, 14.0, -uTime * 0.026);
    float granulation = smoothstep(0.26, 0.93, broad * 0.68 + cells * 0.32);
    float spots = smoothstep(0.67, 0.79, surfaceNoise(vObjectPosition, 3.4, uTime * 0.006));
    float limb = pow(max(vViewNormal.z, 0.0), 0.34);
    vec3 ember = vec3(0.92, 0.17, 0.015);
    vec3 gold = vec3(1.0, 0.57, 0.08);
    vec3 whiteHot = vec3(1.0, 0.91, 0.55);
    vec3 color = mix(ember, gold, granulation);
    color = mix(color, whiteHot, pow(granulation, 3.2) * 0.65);
    color *= mix(0.38, 1.22, limb);
    color *= 1.0 - spots * 0.48;
    // Emit above display white so tone mapping gives the star a luminous core
    // while preserving the granulation and darker sunspots.
    gl_FragColor = vec4(color * 2.0, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereVertexShader = `
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;
  void main() {
    float facing = abs(dot(normalize(vViewNormal), normalize(vViewDirection)));
    float innerRim = pow(1.0 - facing, 3.8);
    float outerFade = smoothstep(0.0, 0.2, facing);
    float alpha = innerRim * outerFade * uStrength;
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function seededNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function makeStarfieldTexture(width: number, height: number) {
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(640, Math.round(width * pixelRatio));
  canvas.height = Math.max(640, Math.round(height * pixelRatio));
  const context = canvas.getContext("2d")!;
  const fieldWidth = canvas.width;
  const fieldHeight = canvas.height;

  const background = context.createRadialGradient(
    fieldWidth * 0.5,
    fieldHeight * 0.5,
    0,
    fieldWidth * 0.5,
    fieldHeight * 0.5,
    Math.hypot(fieldWidth, fieldHeight) * 0.58
  );
  background.addColorStop(0, "#091421");
  background.addColorStop(0.55, "#040a12");
  background.addColorStop(1, "#02050a");
  context.fillStyle = background;
  context.fillRect(0, 0, fieldWidth, fieldHeight);

  const layers = [
    { spacing: 94, radius: [0.38, 0.7], alpha: [0.22, 0.5], seed: 241 },
    { spacing: 188, radius: [0.72, 1.15], alpha: [0.4, 0.72], seed: 271 },
    { spacing: 350, radius: [1.15, 1.7], alpha: [0.58, 0.9], seed: 307 },
  ];

  layers.forEach((layer, layerIndex) => {
    const spacing = layer.spacing * pixelRatio;
    const columns = Math.max(5, Math.ceil(fieldWidth / spacing));
    const rows = Math.max(5, Math.ceil(fieldHeight / spacing));
    const cellWidth = fieldWidth / columns;
    const cellHeight = fieldHeight / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const starIndex = row * columns + column;
        const x = (column + 0.16 + seededNoise(starIndex, 61 + layerIndex, layer.seed) * 0.68) * cellWidth;
        const y = (row + 0.16 + seededNoise(starIndex, 67 + layerIndex, layer.seed) * 0.68) * cellHeight;
        const radius = THREE.MathUtils.lerp(
          layer.radius[0],
          layer.radius[1],
          seededNoise(starIndex, 71 + layerIndex, layer.seed)
        ) * pixelRatio;
        const alpha = THREE.MathUtils.lerp(
          layer.alpha[0],
          layer.alpha[1],
          seededNoise(starIndex, 73 + layerIndex, layer.seed)
        );
        const warmth = seededNoise(starIndex, 79 + layerIndex, layer.seed);
        const red = Math.round(184 + warmth * 42);
        const green = Math.round(207 + warmth * 30);
        const blue = Math.round(225 + (1 - warmth) * 28);

        if (layerIndex === layers.length - 1) {
          const halo = context.createRadialGradient(x, y, 0, x, y, radius * 3.4);
          halo.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha * 0.32})`);
          halo.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
          context.fillStyle = halo;
          context.beginPath();
          context.arc(x, y, radius * 3.4, 0, Math.PI * 2);
          context.fill();
        }

        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function cylinderAlongX(length: number, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  mesh.rotation.z = -Math.PI / 2;
  return mesh;
}

function makeGear(
  pitchRadius: number,
  teeth: number,
  thickness: number,
  material: THREE.Material,
  phase = 0,
  timingMaterial?: THREE.Material
) {
  const gear = new THREE.Group();
  const shape = new THREE.Shape();
  const toothDepth = pitchRadius / teeth * 0.72;
  for (let step = 0; step <= teeth * 4; step += 1) {
    const angle = phase + (step / (teeth * 4)) * Math.PI * 2;
    const toothStep = step % 4;
    const radius = toothStep === 1 || toothStep === 2 ? pitchRadius + toothDepth : pitchRadius - toothDepth;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (step === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const innerRadius = Math.max(0.16, pitchRadius * 0.58);
  const hubRadius = Math.max(0.11, pitchRadius * 0.15);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1 });
  geometry.translate(0, 0, -thickness / 2);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  gear.add(new THREE.Mesh(geometry, material));

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(hubRadius, hubRadius, thickness * 1.08, 18), material);
  gear.add(hub);
  const spokeLength = Math.max(0.02, innerRadius - hubRadius);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(spokeLength, thickness * 0.76, Math.max(0.026, pitchRadius * 0.035)), material);
    spoke.position.set(Math.cos(angle) * (hubRadius + spokeLength / 2), 0, Math.sin(angle) * (hubRadius + spokeLength / 2));
    spoke.rotation.y = -angle;
    gear.add(spoke);
  }
  if (timingMaterial) {
    const markerLength = Math.max(0.08, pitchRadius * 0.16);
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(markerLength, thickness * 0.34, Math.max(0.022, pitchRadius * 0.024)),
      timingMaterial
    );
    marker.position.set((innerRadius + pitchRadius) * 0.5, thickness * 0.62, 0);
    gear.add(marker);
  }
  return gear;
}

function rectangleTouchesCircle(
  rectangle: { left: number; top: number; width: number; height: number },
  circle: { x: number; y: number; radius: number }
) {
  const nearestX = THREE.MathUtils.clamp(circle.x, rectangle.left, rectangle.left + rectangle.width);
  const nearestY = THREE.MathUtils.clamp(circle.y, rectangle.top, rectangle.top + rectangle.height);
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.radius + 5;
}

function rectangleOverlapRatio(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number }
) {
  const overlapWidth = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const overlapHeight = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return overlapWidth * overlapHeight / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}

function rectangleCoversCircleCenter(
  rectangle: { left: number; top: number; width: number; height: number },
  circle: { x: number; y: number }
) {
  return circle.x > rectangle.left && circle.x < rectangle.left + rectangle.width &&
    circle.y > rectangle.top && circle.y < rectangle.top + rectangle.height;
}

export function OrreryScene({ selectedId, quiet, onSelect, onClear, onNavigate, transitionActive = false, onDepartureFrame }: OrrerySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const originRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const leaderRef = useRef<HTMLSpanElement>(null);
  const labelLeaderRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const ringLabelRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const selectedRef = useRef(selectedId);
  const quietRef = useRef(quiet);
  const hoveredRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const onClearRef = useRef(onClear);
  const transitionRef = useRef(transitionActive);
  const departureFrameRef = useRef(onDepartureFrame);

  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  useEffect(() => { quietRef.current = quiet; }, [quiet]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onClearRef.current = onClear; }, [onClear]);
  useEffect(() => { transitionRef.current = transitionActive; }, [transitionActive]);
  useEffect(() => { departureFrameRef.current = onDepartureFrame; }, [onDepartureFrame]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03060c, 0.018);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x02050a, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    mount.appendChild(renderer.domElement);

    const system = new THREE.Group();
    system.rotation.z = -0.045;
    scene.add(system);

    const ambient = new THREE.AmbientLight(0x34506d, 0.35);
    scene.add(ambient);
    const skyFill = new THREE.HemisphereLight(0x7ca5c9, 0x09070e, 0.72);
    scene.add(skyFill);
    const rimLight = new THREE.DirectionalLight(0x79bfe0, 1.15);
    rimLight.position.set(-4, 11, 15);
    scene.add(rimLight);
    const sunLight = new THREE.PointLight(0xffd18b, 150, 32, 1.55);
    scene.add(sunLight);

    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
    });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.72, 64, 48), sunMaterial);
    sun.rotation.z = -0.17;
    system.add(sun);
    const coronaTexture = (() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const context = canvas.getContext("2d")!;
        const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
        gradient.addColorStop(0, "rgba(255,246,202,1)");
        gradient.addColorStop(0.12, "rgba(255,220,128,.98)");
        gradient.addColorStop(0.28, "rgba(255,156,52,.42)");
        gradient.addColorStop(0.58, "rgba(255,105,24,.12)");
        gradient.addColorStop(0.78, "rgba(255,90,16,.04)");
        gradient.addColorStop(0.92, "rgba(255,120,20,0)");
        gradient.addColorStop(1, "rgba(255,120,20,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        return map;
      })();
    const coronaMaterial = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const corona = new THREE.Sprite(coronaMaterial);
    corona.scale.set(4.35, 4.35, 1);
    system.add(corona);
    const outerCoronaMaterial = coronaMaterial.clone();
    outerCoronaMaterial.opacity = 0.34;
    const outerCorona = new THREE.Sprite(outerCoronaMaterial);
    outerCorona.scale.set(6.8, 6.8, 1);
    system.add(outerCorona);

    const steelBase = new THREE.MeshStandardMaterial({
      color: 0x1d2529,
      emissive: 0x070a0d,
      emissiveIntensity: 0.18,
      metalness: 0.9,
      roughness: 0.26,
      transparent: true,
      opacity: 0.78,
    });
    const caseMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c0c0d,
      emissive: 0x020304,
      emissiveIntensity: 0.08,
      metalness: 0.06,
      roughness: 0.88,
    });
    const eclipticRadius = 17;
    const eclipticHeight = 0.24;
    const plinthSide = new THREE.Mesh(
      new THREE.CylinderGeometry(eclipticRadius + 0.38, eclipticRadius + 0.48, 1.02, 96, 1, true),
      caseMaterial
    );
    plinthSide.position.y = -0.98;
    system.add(plinthSide);
    const plinthRim = new THREE.Mesh(new THREE.TorusGeometry(eclipticRadius + 0.38, 0.22, 12, 192), caseMaterial);
    plinthRim.rotation.x = Math.PI / 2;
    plinthRim.position.y = -0.46;
    system.add(plinthRim);
    const plinthTopMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x34434a,
      metalness: 0.04,
      roughness: 0.05,
      transmission: 0.64,
      thickness: 0.12,
      ior: 1.45,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    plinthTopMaterial.depthWrite = false;
    const plinthTop = new THREE.Mesh(new THREE.CircleGeometry(eclipticRadius + 0.14, 96), plinthTopMaterial);
    plinthTop.rotation.x = -Math.PI / 2;
    plinthTop.position.y = -0.48;
    plinthTop.renderOrder = 1;
    system.add(plinthTop);

    const eclipticMaterial = new THREE.MeshStandardMaterial({
      color: 0x81745d,
      emissive: 0x302512,
      emissiveIntensity: 0.3,
      metalness: 0.92,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    const gearTimingMaterial = eclipticMaterial.clone();
    gearTimingMaterial.color.set(0xc39b58);
    gearTimingMaterial.emissive.set(0x3d270d);
    gearTimingMaterial.opacity = 0.78;

    const caseEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x71838a,
      emissive: 0x15232a,
      emissiveIntensity: 0.22,
      metalness: 0.5,
      roughness: 0.18,
      transparent: true,
      opacity: 0.54,
    });
    const caseEdge = new THREE.Mesh(new THREE.TorusGeometry(eclipticRadius + 0.14, 0.025, 8, 192), caseEdgeMaterial);
    caseEdge.rotation.x = Math.PI / 2;
    caseEdge.position.y = -0.445;
    system.add(caseEdge);

    const annulusMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3b25,
      emissive: 0x160f08,
      emissiveIntensity: 0.18,
      metalness: 0.86,
      roughness: 0.34,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    const annulusInnerRadius = Math.max(...worldConfigs.map((world) => world.orbit + world.radius)) + 1.37;
    const annulusOuterRadius = eclipticRadius - 0.22;
    const annulus = new THREE.Mesh(
      new THREE.RingGeometry(annulusInnerRadius, annulusOuterRadius, 144, 1),
      annulusMaterial
    );
    annulus.rotation.x = -Math.PI / 2;
    annulus.position.y = -0.43;
    system.add(annulus);
    const annulusDivisions = new THREE.Group();
    for (let index = 0; index < 72; index += 1) {
      const angle = index / 72 * Math.PI * 2;
      const major = index % 6 === 0;
      const divisionMaterial = annulusMaterial.clone();
      divisionMaterial.color.set(major ? 0x8f7345 : 0x675237);
      divisionMaterial.emissiveIntensity = major ? 0.24 : 0.12;
      divisionMaterial.opacity = major ? 0.62 : 0.34;
      const division = new THREE.Mesh(
        new THREE.BoxGeometry(annulusOuterRadius - annulusInnerRadius, 0.018, major ? 0.036 : 0.016),
        divisionMaterial
      );
      const midRadius = (annulusInnerRadius + annulusOuterRadius) / 2;
      division.position.set(Math.cos(angle) * midRadius, -0.405, Math.sin(angle) * midRadius);
      division.rotation.y = -angle;
      annulusDivisions.add(division);
    }
    system.add(annulusDivisions);
    [annulusInnerRadius, annulusOuterRadius].forEach((radius, index) => {
      const boundaryMaterial = annulusMaterial.clone();
      boundaryMaterial.color.set(index === 0 ? 0x69563b : 0x8a7045);
      boundaryMaterial.opacity = index === 0 ? 0.48 : 0.66;
      const boundary = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 7, 192), boundaryMaterial);
      boundary.rotation.x = Math.PI / 2;
      boundary.position.y = -0.39;
      system.add(boundary);
    });
    [eclipticRadius - 0.16, eclipticRadius + 0.16].forEach((radius) => {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 8, 192), eclipticMaterial);
      rail.rotation.x = Math.PI / 2;
      rail.position.y = eclipticHeight;
      system.add(rail);
    });
    const scaleMarks = new THREE.Group();
    for (let index = 0; index < 72; index += 1) {
      const angle = index / 72 * Math.PI * 2;
      const major = index % 6 === 0;
      const length = major ? 0.3 : index % 3 === 0 ? 0.21 : 0.12;
      const markMaterial = eclipticMaterial.clone();
      markMaterial.opacity = major ? 0.95 : 0.58;
      const mark = new THREE.Mesh(new THREE.BoxGeometry(length, major ? 0.035 : 0.022, 0.025), markMaterial);
      mark.position.set(Math.cos(angle) * eclipticRadius, eclipticHeight, Math.sin(angle) * eclipticRadius);
      mark.rotation.y = -angle;
      scaleMarks.add(mark);
    }
    system.add(scaleMarks);
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.68, 10), eclipticMaterial.clone());
      support.position.set(Math.cos(angle) * eclipticRadius, -0.1, Math.sin(angle) * eclipticRadius);
      system.add(support);
    }

    const fixedSunTube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 3.0, 18), steelBase.clone());
    fixedSunTube.position.y = 0.18;
    system.add(fixedSunTube);
    sun.position.y = 1.63;
    corona.position.y = 1.63;
    outerCorona.position.y = 1.63;
    sunLight.position.y = 1.63;

    const gearModule = 0.021;
    const totalTeeth = gearTotalTeeth;
    const collarTeeth = gearCollarTeeth;
    const driveTeeth = gearDriveTeeth;
    const driveDistance = totalTeeth * gearModule;
    const gearLevels = worldConfigs.map((_, index) => -1.35 + index * 0.75 / (worldConfigs.length - 1));
    const driveShaft = new THREE.Group();
    driveShaft.position.set(driveDistance, -0.975, 0);
    const driveShaftCore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.02, 16), steelBase.clone());
    driveShaft.add(driveShaftCore);
    const driveShaftKey = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.86, 0.035), gearTimingMaterial);
    driveShaftKey.position.x = 0.105;
    driveShaft.add(driveShaftKey);
    system.add(driveShaft);

    const armHeights = worldConfigs.map((_, index) => 0.74 - index * 0.7 / (worldConfigs.length - 1));
    const worldCenterHeight = 1.36;
    const carriers = worldConfigs.map((config, index) => {
      const carrier = new THREE.Group();
      const material = steelBase.clone();
      material.color.set(0x343532);
      material.opacity = 0.78;
      const shaftBottom = gearLevels[index];
      const shaftHeight = armHeights[index] - shaftBottom;
      const tubeRadius = 0.1 + index * 0.027;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(tubeRadius, tubeRadius, shaftHeight, 18),
        material
      );
      shaft.position.y = shaftBottom + shaftHeight / 2;
      carrier.add(shaft);

      const collarMaterial = steelBase.clone();
      collarMaterial.color.set(0x403b32);
      collarMaterial.opacity = 0.88;
      const collarPitchRadius = collarTeeth[index] * gearModule;
      const collarGear = makeGear(
        collarPitchRadius,
        collarTeeth[index],
        0.085,
        collarMaterial,
        -0.75 * Math.PI / collarTeeth[index],
        gearTimingMaterial
      );
      collarGear.position.y = gearLevels[index];
      carrier.add(collarGear);

      const hubCollar = new THREE.Mesh(new THREE.TorusGeometry(tubeRadius + 0.035, 0.022, 6, 28), material);
      hubCollar.rotation.x = Math.PI / 2;
      hubCollar.position.y = armHeights[index];
      carrier.add(hubCollar);

      const armStart = tubeRadius + 0.012;
      const armLength = config.orbit - armStart;
      const arm = cylinderAlongX(armLength, 0.06, material);
      arm.position.set(armStart + armLength / 2, armHeights[index], 0);
      carrier.add(arm);

      const stemHeight = worldCenterHeight - config.radius - armHeights[index];
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, stemHeight, 12), material);
      stem.position.set(config.orbit, armHeights[index] + stemHeight / 2, 0);
      carrier.add(stem);

      const collar = new THREE.Mesh(new THREE.TorusGeometry(Math.min(0.14, config.radius * 0.3), 0.027, 6, 28), material);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(config.orbit, worldCenterHeight - config.radius, 0);
      carrier.add(collar);

      const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const hitTarget = new THREE.Mesh(new THREE.BoxGeometry(armLength, 0.34, 0.34), hitMaterial);
      hitTarget.position.set(armStart + armLength / 2, armHeights[index], 0);
      hitTarget.userData.index = index;
      hitTarget.userData.kind = "arm";
      carrier.add(hitTarget);

      const tickColor = new THREE.Color(config.atmosphere);
      const tickMaterial = new THREE.MeshStandardMaterial({
        color: tickColor,
        emissive: tickColor,
        emissiveIntensity: 0.9,
        metalness: 0.38,
        roughness: 0.22,
        transparent: true,
        opacity: 0.92,
      });
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.1), tickMaterial);
      tick.position.set(eclipticRadius, eclipticHeight, 0);
      tick.userData.index = index;
      tick.userData.kind = "tick";
      const tickDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), tickMaterial);
      tickDiamond.position.y = 0.17;
      tick.add(tickDiamond);
      carrier.add(tick);

      system.add(carrier);
      return { carrier, material, arm, stem, shaft, hitTarget, tick, tickMaterial, collarGear, collarMaterial };
    });

    const driveGears = driveTeeth.map((teeth, index) => {
      const pitchRadius = teeth * gearModule;
      const material = steelBase.clone();
      material.color.set(0x383630);
      material.opacity = 0.82;
      const toothGapPhase = -1.75 * Math.PI / teeth;
      const gear = makeGear(pitchRadius, teeth, 0.085, material, toothGapPhase, gearTimingMaterial);
      gear.position.set(driveDistance, gearLevels[index], 0);
      system.add(gear);
      return { gear, material, teeth };
    });

    carriers.forEach(({ carrier }, index) => { carrier.rotation.y = -worldConfigs[index].phase; });
    camera.position.set(0, 22, 13);
    camera.lookAt(0, 0.2, 0);
    camera.updateMatrixWorld(true);
    let starfieldTexture: THREE.CanvasTexture | null = null;
    let starfieldWidth = 0;
    let starfieldHeight = 0;

    const textureLoader = new THREE.TextureLoader();
    let disposed = false;
    const worldMaterials: THREE.MeshStandardMaterial[] = [];
    const atmosphereMaterials: THREE.ShaderMaterial[] = [];
    const worldMeshes = worldConfigs.map((config, index) => {
      const surface = surfaceResponses[config.style];
      // Baked by `pnpm run bake:worlds` from lib/orrery/world-texture.mjs. Until the image
      // arrives the world renders dark; the scene does not wait for it.
      const texture = textureLoader.load(worldTextureUrl(config.style), undefined, undefined, () => {
        if (disposed) return;
        material.map = null;
        material.emissiveMap = null;
        material.bumpMap = null;
        material.color.set(config.atmosphere).multiplyScalar(0.55);
        material.needsUpdate = true;
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = 4;
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color(surface.emissive),
        emissiveIntensity: surface.restingGlow,
        color: 0xffffff,
        roughness: surface.roughness,
        metalness: surface.metalness,
        bumpMap: surface.bumpScale > 0 ? texture : null,
        bumpScale: surface.bumpScale,
      });
      worldMaterials.push(material);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(config.radius, 56, 40), material);
      mesh.rotation.z = config.tilt;
      mesh.userData.index = index;
      mesh.userData.kind = "world";
      mesh.position.set(config.orbit, worldCenterHeight, 0);
      carriers[index].carrier.add(mesh);

      const atmosphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(config.atmosphere) },
          uStrength: { value: 0.3 },
        },
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      atmosphereMaterials.push(atmosphereMaterial);
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(config.radius * 1.075, 48, 32), atmosphereMaterial);
      mesh.add(atmosphere);
      return mesh;
    });
    const labelVectors = worldMeshes.map(() => new THREE.Vector3());
    const screenWorlds = worldMeshes.map(() => ({ x: 0, y: 0, radius: 0, rawRadius: 0 }));
    const labelStates = worldMeshes.map(() => ({ slot: 0, challengedSince: 0, lastChange: 0, tweenUntil: 0 }));

    const cursorLight = createOrreryCursorLight(worldCenterHeight);
    scene.add(cursorLight.light);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const lightPointer = new THREE.Vector2();
    let lightPointerActive = false;
    const trackCursorLight = (event: PointerEvent) => {
      // Touch has no hovering cursor; don't leave a lamp behind after a tap.
      if (event.pointerType === "touch") {
        lightPointerActive = false;
        return;
      }
      const bounds = mount.getBoundingClientRect();
      lightPointer.set(
        ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
        -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1,
      );
      lightPointerActive = true;
    };
    const clearCursorLight = () => { lightPointerActive = false; };
    // Listen on the scene so moving across its HTML labels keeps the light on.
    mount.addEventListener("pointermove", trackCursorLight, { passive: true });
    mount.addEventListener("pointerleave", clearCursorLight);
    mount.addEventListener("pointercancel", clearCursorLight);
    window.addEventListener("blur", clearCursorLight);
    const raycastTargets = [
      ...worldMeshes,
      ...carriers.map((carrier) => carrier.hitTarget),
      ...carriers.map((carrier) => carrier.tick),
      sun,
    ];
    const hitFromPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(raycastTargets, false)[0];
    };
    const selectFromPointer = (event: PointerEvent) => {
      const hit = hitFromPointer(event);
      if (!hit) {
        onClearRef.current();
        return;
      }
      if (hit.object === sun) onSelectRef.current(originArtifact);
      else onSelectRef.current(artifacts[hit.object.userData.index]);
    };
    const markPointerTarget = (event: PointerEvent) => {
      const hit = hitFromPointer(event);
      renderer.domElement.style.cursor = hit ? "pointer" : "default";
      hoveredRef.current = hit
        ? hit.object === sun
          ? originArtifact.id
          : artifacts[hit.object.userData.index].id
        : null;
    };
    const clearPointerTarget = () => { hoveredRef.current = null; };
    renderer.domElement.addEventListener("pointerup", selectFromPointer);
    renderer.domElement.addEventListener("pointermove", markPointerTarget);
    renderer.domElement.addEventListener("pointerleave", clearPointerTarget);
    const clearFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClearRef.current();
    };
    window.addEventListener("keydown", clearFromKeyboard);

    const clock = new THREE.Clock();
    let elapsed = 0;
    let animationFrame = 0;
    let departureCaptured = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const fitCamera = (width: number, height: number) => {
      const aspect = width / Math.max(height, 1);
      const elevation = THREE.MathUtils.degToRad(aspect > 1.75 ? 47 : aspect < 0.85 ? 68 : 57);
      const direction = new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation)).normalize();
      const target = new THREE.Vector3(0, 0.25, 0);
      let distance = 23;
      const topMargin = 40;
      const sideMargin = 40;
      const bottomMargin = width < 700 ? 132 : 102;
      const labelReserve = width < 700 ? 48 : 66;

      const fitPoints: THREE.Vector3[] = [];
      for (let index = 0; index < 32; index += 1) {
        const angle = index / 32 * Math.PI * 2;
        fitPoints.push(new THREE.Vector3(
          Math.cos(angle) * (eclipticRadius + 0.65),
          eclipticHeight,
          Math.sin(angle) * (eclipticRadius + 0.65)
        ));
      }
      worldConfigs.forEach((config) => {
        for (let sample = 0; sample < 8; sample += 1) {
          const angle = sample / 8 * Math.PI * 2;
          const radius = config.orbit + config.radius * 1.2;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const worldY = worldCenterHeight;
          fitPoints.push(
            new THREE.Vector3(x, worldY + config.radius * 1.2, z),
            new THREE.Vector3(x, worldY - config.radius * 1.2, z)
          );
        }
      });

      const setCamera = () => {
        camera.position.copy(target).addScaledVector(direction, distance);
        // Narrow viewports pull the camera back beyond the original fixed far plane.
        camera.far = Math.max(100, distance + eclipticRadius * 2 + 10);
        camera.lookAt(target);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        system.updateMatrixWorld(true);
      };
      const bounds = () => {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        fitPoints.forEach((localPoint) => {
          const projected = system.localToWorld(localPoint.clone()).project(camera);
          const x = (projected.x * 0.5 + 0.5) * width;
          const y = (-projected.y * 0.5 + 0.5) * height;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        });
        return { minX: minX - labelReserve, maxX: maxX + labelReserve, minY: minY - labelReserve, maxY: maxY + labelReserve };
      };

      for (let pass = 0; pass < 5; pass += 1) {
        setCamera();
        const box = bounds();
        const availableWidth = Math.max(120, width - sideMargin * 2);
        const availableHeight = Math.max(160, height - topMargin - bottomMargin);
        const scale = Math.max((box.maxX - box.minX) / availableWidth, (box.maxY - box.minY) / availableHeight);
        distance *= Math.max(1, scale * 1.015);
      }

      for (let pass = 0; pass < 2; pass += 1) {
        setCamera();
        const box = bounds();
        const desiredX = width / 2;
        const desiredY = topMargin + (height - topMargin - bottomMargin) / 2;
        const errorX = (box.minX + box.maxX) / 2 - desiredX;
        const errorY = (box.minY + box.maxY) / 2 - desiredY;
        const worldPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / height;
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
        target.addScaledVector(cameraRight, errorX * worldPerPixel);
        target.addScaledVector(cameraUp, -errorY * worldPerPixel);
      }
      setCamera();

      const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      const toScreen = (worldPoint: THREE.Vector3) => {
        const projected = worldPoint.clone().project(camera);
        return new THREE.Vector2(
          (projected.x * 0.5 + 0.5) * width,
          (-projected.y * 0.5 + 0.5) * height
        );
      };
      let minimumEclipticGap = Infinity;
      worldConfigs.forEach((config) => {
        for (let sample = 0; sample < 360; sample += 1) {
          const angle = sample / 360 * Math.PI * 2;
          const worldCenter = system.localToWorld(new THREE.Vector3(
            Math.cos(angle) * config.orbit,
            worldCenterHeight,
            Math.sin(angle) * config.orbit
          ));
          const railPoint = system.localToWorld(new THREE.Vector3(
            Math.cos(angle) * (eclipticRadius - 0.16),
            eclipticHeight,
            Math.sin(angle) * (eclipticRadius - 0.16)
          ));
          const center = toScreen(worldCenter);
          const rail = toScreen(railPoint);
          const selectedRadius = config.radius * 1.2;
          const horizontalEdge = toScreen(worldCenter.clone().addScaledVector(cameraRight, selectedRadius));
          const verticalEdge = toScreen(worldCenter.clone().addScaledVector(cameraUp, selectedRadius));
          const projectedRadius = Math.max(center.distanceTo(horizontalEdge), center.distanceTo(verticalEdge));
          minimumEclipticGap = Math.min(minimumEclipticGap, center.distanceTo(rail) - projectedRadius);
        }
      });
      mount.dataset.minEclipticGap = minimumEclipticGap.toFixed(1);
    };

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      fitCamera(width, height);
      if (Math.abs(width - starfieldWidth) >= 2 || Math.abs(height - starfieldHeight) >= 2) {
        const nextStarfield = makeStarfieldTexture(width, height);
        starfieldTexture?.dispose();
        starfieldTexture = nextStarfield;
        starfieldWidth = width;
        starfieldHeight = height;
        scene.background = starfieldTexture;
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      // The captured planet now belongs to the transition layer. Keep the frozen scene
      // available for cancellation without spending a full WebGL render behind it.
      if (transitionRef.current && departureCaptured) {
        animationFrame = requestAnimationFrame(render);
        return;
      }
      const motionAllowed = !quietRef.current && !reducedMotion.matches && !transitionRef.current;
      if (motionAllowed) elapsed += delta;
      const sceneTime = elapsed;
      sunMaterial.uniforms.uTime.value = sceneTime;
      sun.rotation.y = sceneTime * 0.055;
      const coronaPulse = 1 + Math.sin(sceneTime * 0.72) * 0.026;
      corona.scale.set(4.35 * coronaPulse, 4.35 * coronaPulse, 1);
      outerCorona.scale.set(7.5 / coronaPulse, 7.5 / coronaPulse, 1);
      sunLight.intensity = 150 + Math.sin(sceneTime * 0.68) * 4;
      const inputAngle = sceneTime * sharedDriveSpeed;
      driveShaft.rotation.y = inputAngle;

      worldMeshes.forEach((mesh, index) => {
        const config = worldConfigs[index];
        const angle = config.phase + sceneTime * config.orbitSpeed;
        carriers[index].carrier.rotation.y = -angle;
        driveGears[index].gear.rotation.y = config.phase * (collarTeeth[index] / driveTeeth[index]) + inputAngle;
        if (motionAllowed) mesh.rotation.y += delta * config.spinSpeed;
        const selected = artifacts[index].id === selectedRef.current;
        const hovered = artifacts[index].id === hoveredRef.current;
        const active = selected || hovered;
        const hasSelection = selectedRef.current !== null;
        const surface = surfaceResponses[config.style];
        const targetScale = selected ? 1.2 : hovered ? 1.1 : hasSelection ? 0.97 : 1;
        const nextScale = THREE.MathUtils.lerp(mesh.scale.x, targetScale, motionAllowed ? 0.08 : 1);
        mesh.scale.setScalar(nextScale);

        worldMaterials[index].emissiveIntensity = THREE.MathUtils.lerp(
          worldMaterials[index].emissiveIntensity,
          selected ? surface.selectedGlow : hasSelection ? surface.recededGlow : surface.restingGlow,
          motionAllowed ? 0.09 : 1
        );
        atmosphereMaterials[index].uniforms.uStrength.value = THREE.MathUtils.lerp(
          atmosphereMaterials[index].uniforms.uStrength.value,
          selected ? 0.62 : hasSelection ? 0.22 : 0.34,
          motionAllowed ? 0.09 : 1
        );
        carriers[index].material.color.set(active ? 0x76654a : 0x343532);
        carriers[index].material.emissive.set(active ? 0x3a2610 : 0x071016);
        carriers[index].material.opacity = selected ? 0.92 : hovered ? 0.86 : hasSelection ? 0.42 : 0.78;
        carriers[index].tickMaterial.emissiveIntensity = selected ? 1.45 : hovered ? 1.2 : hasSelection ? 0.55 : 1.05;
        carriers[index].tickMaterial.opacity = selected ? 0.98 : hovered ? 0.94 : hasSelection ? 0.42 : 0.9;
        carriers[index].collarMaterial.emissive.set(active ? 0x39240d : 0x070a0d);
        carriers[index].collarMaterial.opacity = selected ? 1 : hovered ? 0.96 : hasSelection ? 0.52 : 0.88;
        driveGears[index].material.emissive.set(active ? 0x39240d : 0x070a0d);
        driveGears[index].material.opacity = selected ? 0.96 : hovered ? 0.9 : hasSelection ? 0.46 : 0.82;
      });

      system.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      cursorLight.update(
        lightPointerActive && !transitionRef.current ? lightPointer : null,
        camera,
        delta,
        quietRef.current || reducedMotion.matches || transitionRef.current,
      );
      const viewportWidth = mount.clientWidth;
      const viewportHeight = mount.clientHeight;
      const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const projectWorld = (worldPosition: THREE.Vector3) => {
        const projected = worldPosition.clone().project(camera);
        return {
          x: (projected.x * 0.5 + 0.5) * viewportWidth,
          y: (-projected.y * 0.5 + 0.5) * viewportHeight,
          z: projected.z,
        };
      };

      worldMeshes.forEach((mesh, index) => {
        const worldPosition = mesh.getWorldPosition(labelVectors[index]);
        const center = projectWorld(worldPosition);
        const edge = projectWorld(worldPosition.clone().addScaledVector(cameraRight, worldConfigs[index].radius * mesh.scale.x));
        screenWorlds[index].x = center.x;
        screenWorlds[index].y = center.y;
        screenWorlds[index].rawRadius = Math.hypot(edge.x - center.x, edge.y - center.y);
        screenWorlds[index].radius = Math.max(12, screenWorlds[index].rawRadius);
        const label = labelRefs.current[index];
        if (label) {
          const visible = center.z >= -1 && center.z <= 1;
          label.style.visibility = visible ? "visible" : "hidden";
          label.style.pointerEvents = visible ? "auto" : "none";
          label.tabIndex = visible ? 0 : -1;
        }

        const ringLabel = ringLabelRefs.current[index];
        if (ringLabel) {
          const tickPosition = carriers[index].tick.getWorldPosition(new THREE.Vector3());
          const tick = projectWorld(tickPosition);
          const outwardX = tick.x - viewportWidth / 2;
          const outwardY = tick.y - viewportHeight / 2;
          const outwardLength = Math.max(1, Math.hypot(outwardX, outwardY));
          const active = selectedRef.current === artifacts[index].id || hoveredRef.current === artifacts[index].id;
          ringLabel.style.left = `${tick.x + outwardX / outwardLength * 30}px`;
          ringLabel.style.top = `${tick.y + outwardY / outwardLength * 24}px`;
          ringLabel.style.visibility = active && tick.z >= -1 && tick.z <= 1 ? "visible" : "hidden";
          ringLabel.style.opacity = active ? "1" : "0";
          ringLabel.style.pointerEvents = active ? "auto" : "none";
          ringLabel.tabIndex = active ? 0 : -1;
        }
      });

      const originWorldPosition = sun.getWorldPosition(new THREE.Vector3());
      const originCenter = projectWorld(originWorldPosition);
      const originEdge = projectWorld(originWorldPosition.clone().addScaledVector(cameraRight, 0.72));
      const originCircle = {
        x: originCenter.x,
        y: originCenter.y,
        radius: Math.max(18, Math.hypot(originEdge.x - originCenter.x, originEdge.y - originCenter.y)),
      };
      let originLabelRectangle: { left: number; top: number; width: number; height: number } | null = null;
      if (originRef.current) {
        const chipWidth = originRef.current.offsetWidth || 72;
        const chipHeight = originRef.current.offsetHeight || 32;
        const left = originCircle.x - chipWidth / 2;
        const top = originCircle.y - originCircle.radius - chipHeight - 10;
        originRef.current.style.left = `${left}px`;
        originRef.current.style.top = `${top}px`;
        originRef.current.style.transform = "none";
        originLabelRectangle = { left, top, width: chipWidth, height: chipHeight };
      }

      const placedLabels: Array<{ left: number; top: number; width: number; height: number }> = [];
      const now = performance.now();
      const priorityOrder = artifacts.map((_, index) => index).sort((a, b) => {
        const priority = (index: number) => selectedRef.current === artifacts[index].id ? 0 : hoveredRef.current === artifacts[index].id ? 1 : index + 2;
        return priority(a) - priority(b);
      });
      priorityOrder.forEach((index) => {
        const element = labelRefs.current[index];
        if (!element) return;
        const circle = screenWorlds[index];
        const state = labelStates[index];
        const measuredWidth = element.offsetWidth || 72;
        const measuredHeight = element.offsetHeight || 32;
        if (!element.dataset.fullWidth && measuredWidth > 16) element.dataset.fullWidth = `${measuredWidth}`;
        if (!element.dataset.fullHeight && measuredHeight > 16) element.dataset.fullHeight = `${measuredHeight}`;
        const chipWidth = Number(element.dataset.fullWidth) || measuredWidth;
        const chipHeight = Number(element.dataset.fullHeight) || measuredHeight;
        const baseLeft = circle.x - chipWidth / 2;
        const baseTop = circle.y - circle.radius - chipHeight - 10;
        const horizontalStep = Math.max(16, Math.min(34, chipWidth * 0.28));
        const horizontalOffsets = [0, 1, -1, 2, -2].map((step) => step * horizontalStep);
        const candidates = [
          ...horizontalOffsets.map((x) => ({ x, y: 0 })),
          ...horizontalOffsets.slice(0, 3).map((x) => ({ x, y: -14 })),
        ].map(({ x, y }) => ({
          left: baseLeft + x,
          top: baseTop + y,
          width: chipWidth,
          height: chipHeight,
        }));

        const candidateScore = (candidate: { left: number; top: number; width: number; height: number }) => {
          const signedOffset = candidate.left + candidate.width / 2 - circle.x;
          const centerOffset = Math.abs(signedOffset);
          const outwardDirection = Math.sign(circle.x - viewportWidth / 2) || 1;
          let score = centerOffset * 0.32 + Math.abs(candidate.top - baseTop) * 0.5;
          score -= signedOffset * outwardDirection * 0.14;
          if (candidate.left < 10) score += 4000 + (10 - candidate.left) * 100;
          if (candidate.top < 74) score += 4000 + (74 - candidate.top) * 100;
          if (candidate.left + candidate.width > viewportWidth - 10) score += 4000 + (candidate.left + candidate.width - viewportWidth + 10) * 100;
          if (candidate.top + candidate.height > viewportHeight - 82) score += 4000 + (candidate.top + candidate.height - viewportHeight + 82) * 100;

          screenWorlds.forEach((otherCircle, otherIndex) => {
            if (otherIndex === index || !rectangleTouchesCircle(candidate, otherCircle)) return;
            score += rectangleCoversCircleCenter(candidate, otherCircle) ? 900 : 48;
          });
          if (rectangleTouchesCircle(candidate, originCircle)) {
            score += rectangleCoversCircleCenter(candidate, originCircle) ? 520 : 22;
          }
          placedLabels.forEach((otherLabel) => {
            const overlap = rectangleOverlapRatio(candidate, otherLabel);
            score += overlap < 0.18 ? overlap * 70 : overlap * 430;
          });
          if (originLabelRectangle) {
            const overlap = rectangleOverlapRatio(candidate, originLabelRectangle);
            const originWeight = artifacts[index].id === "sky" ? 70 : 160;
            score += overlap * originWeight;
          }
          return score;
        };

        if (state.slot >= candidates.length) state.slot = 0;
        const scoredCandidates = candidates.map((candidate, slot) => ({ slot, score: candidateScore(candidate) }));
        const best = scoredCandidates.reduce((winner, candidate) => candidate.score < winner.score ? candidate : winner);
        const currentScore = scoredCandidates[state.slot].score;
        const materiallyBetter = best.slot !== state.slot && best.score + 8 < currentScore;
        if (materiallyBetter) {
          if (state.challengedSince === 0) state.challengedSince = now;
          if (now - state.challengedSince >= 140 && now - state.lastChange >= 220) {
            state.slot = best.slot;
            state.lastChange = now;
            state.tweenUntil = now + 190;
            state.challengedSince = 0;
          }
        } else {
          state.challengedSince = 0;
        }

        const placement = candidates[state.slot];
        element.style.transition = now < state.tweenUntil
          ? "left .18s ease, top .18s ease, color .2s, border-color .2s, background .2s, box-shadow .2s"
          : "color .2s, border-color .2s, background .2s, box-shadow .2s";
        element.style.left = `${placement.left}px`;
        element.style.top = `${placement.top}px`;
        element.style.transform = "none";
        placedLabels.push(placement);

        const labelLeader = labelLeaderRefs.current[index];
        if (labelLeader) {
          const displaced = state.slot !== 0;
          const labelX = placement.left + placement.width / 2;
          const labelY = placement.top + placement.height / 2;
          const dx = labelX - circle.x;
          const dy = labelY - circle.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const startX = circle.x + dx / distance * circle.radius;
          const startY = circle.y + dy / distance * circle.radius;
          labelLeader.style.left = `${startX}px`;
          labelLeader.style.top = `${startY}px`;
          labelLeader.style.width = `${Math.max(0, distance - circle.radius)}px`;
          labelLeader.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
          labelLeader.style.opacity = displaced ? "0.72" : "0";
        }
      });

      const selectedIndex = artifacts.findIndex((item) => item.id === selectedRef.current);
      const detailTarget = selectedIndex >= 0 ? worldMeshes[selectedIndex] : sun;
      const detailPosition = new THREE.Vector3();
      detailTarget.getWorldPosition(detailPosition);
      const detailProjected = detailPosition.project(camera);
      const targetX = (detailProjected.x * 0.5 + 0.5) * mount.clientWidth;
      const targetY = (-detailProjected.y * 0.5 + 0.5) * mount.clientHeight;
      const detail = detailRef.current;
      const leader = leaderRef.current;
      if (detail && leader && mount.clientWidth >= 700) {
        const panelWidth = Math.min(356, mount.clientWidth * 0.3);
        const panelHeight = detail.offsetHeight || 210;
        const panelTop = THREE.MathUtils.clamp(targetY - panelHeight * 0.42, 92, mount.clientHeight - panelHeight - 28);
        const panelGap = 58;
        const outwardIsRight = targetX >= mount.clientWidth / 2;
        const sideCandidates = [true, false].map((placeRight) => {
          const left = placeRight ? targetX + panelGap : targetX - panelWidth - panelGap;
          const rectangle = { left, top: panelTop, width: panelWidth, height: panelHeight };
          const overflow = Math.max(0, 24 - left) + Math.max(0, left + panelWidth - mount.clientWidth + 24);
          let score = overflow * 120;
          screenWorlds.forEach((circle, index) => {
            if (index === selectedIndex || !rectangleTouchesCircle(rectangle, circle)) return;
            score += rectangleCoversCircleCenter(rectangle, circle) ? 1100 : 120;
          });
          if (placeRight !== outwardIsRight) score += 90;
          return { placeRight, left, score };
        });
        const chosenSide = sideCandidates.reduce((best, candidate) => candidate.score < best.score ? candidate : best);
        const placeRight = chosenSide.placeRight;
        const panelLeft = THREE.MathUtils.clamp(chosenSide.left, 24, mount.clientWidth - panelWidth - 24);
        detail.style.width = `${panelWidth}px`;
        detail.style.left = `${panelLeft}px`;
        detail.style.top = `${panelTop}px`;
        const lineEndX = placeRight ? panelLeft : panelLeft + panelWidth;
        const lineEndY = panelTop + Math.min(72, panelHeight * 0.35);
        const lineLength = Math.hypot(lineEndX - targetX, lineEndY - targetY);
        const lineAngle = Math.atan2(lineEndY - targetY, lineEndX - targetX);
        leader.style.left = `${targetX}px`;
        leader.style.top = `${targetY}px`;
        leader.style.width = `${lineLength}px`;
        leader.style.transform = `rotate(${lineAngle}rad)`;
      }

      renderer.render(scene, camera);

      if (transitionRef.current && selectedRef.current === "cocktails" && !departureCaptured) {
        const cocktailsIndex = artifacts.findIndex((item) => item.id === "cocktails");
        const circle = screenWorlds[cocktailsIndex];
        if (circle && Number.isFinite(circle.x) && Number.isFinite(circle.y) && circle.rawRadius > 1) {
          const captureRadius = circle.rawRadius * 1.18;
          const captureSize = 640;
          const capture = document.createElement("canvas");
          capture.width = captureSize;
          capture.height = captureSize;
          const context = capture.getContext("2d");
          if (context) {
            const scaleX = renderer.domElement.width / Math.max(1, mount.clientWidth);
            const scaleY = renderer.domElement.height / Math.max(1, mount.clientHeight);
            context.clearRect(0, 0, captureSize, captureSize);
            context.save();
            context.beginPath();
            context.arc(captureSize / 2, captureSize / 2, captureSize / 2 - 1, 0, Math.PI * 2);
            context.clip();
            context.drawImage(
              renderer.domElement,
              (circle.x - captureRadius) * scaleX,
              (circle.y - captureRadius) * scaleY,
              captureRadius * 2 * scaleX,
              captureRadius * 2 * scaleY,
              0,
              0,
              captureSize,
              captureSize,
            );
            context.restore();
            const mountBounds = mount.getBoundingClientRect();
            departureCaptured = true;
            worldMeshes[cocktailsIndex].visible = false;
            renderer.render(scene, camera);
            departureFrameRef.current?.({
              image: capture.toDataURL("image/png"),
              centerX: mountBounds.left + circle.x,
              centerY: mountBounds.top + circle.y,
              radius: captureRadius,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
            });
          }
        }
      } else if (!transitionRef.current) {
        const cocktailsIndex = artifacts.findIndex((item) => item.id === "cocktails");
        if (cocktailsIndex >= 0) worldMeshes[cocktailsIndex].visible = true;
        departureCaptured = false;
      }
      // Labels start at the stage's top-left corner; reveal them once a frame has placed them.
      if (!mount.dataset.ready) mount.dataset.ready = "true";
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      delete mount.dataset.ready;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      mount.removeEventListener("pointermove", trackCursorLight);
      mount.removeEventListener("pointerleave", clearCursorLight);
      mount.removeEventListener("pointercancel", clearCursorLight);
      window.removeEventListener("blur", clearCursorLight);
      renderer.domElement.removeEventListener("pointerup", selectFromPointer);
      renderer.domElement.removeEventListener("pointermove", markPointerTarget);
      renderer.domElement.removeEventListener("pointerleave", clearPointerTarget);
      window.removeEventListener("keydown", clearFromKeyboard);
      renderer.dispose();
      starfieldTexture?.dispose();
      scene.background = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.SpriteMaterial) material.map?.dispose();
            material.dispose();
          });
        }
      });
      renderer.domElement.remove();
    };
  }, []);

  const selectedArtifact = selectedId === null
    ? null
    : selectedId === originArtifact.id
    ? originArtifact
    : artifacts.find((item) => item.id === selectedId) ?? artifacts[0];

  return (
    <div className="orrery-scene" ref={mountRef} role="group" aria-label={`${artifacts.length} moving subject worlds orbiting a central star`}>
      <div className="orrery-world-labels">
        {artifacts.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => { labelRefs.current[index] = node; }}
            className={selectedId === item.id ? "selected" : ""}
            style={{ "--label-accent": item.accent } as React.CSSProperties}
            onClick={() => onSelect(item)}
            onMouseEnter={() => { hoveredRef.current = item.id; }}
            onMouseLeave={() => { hoveredRef.current = null; }}
            onFocus={() => { hoveredRef.current = item.id; }}
            onBlur={() => { hoveredRef.current = null; }}
            aria-pressed={selectedId === item.id}
          >
            <strong>{item.short}</strong>
          </button>
        ))}
        {artifacts.map((item, index) => (
          <span key={`${item.id}-leader`} ref={(node) => { labelLeaderRefs.current[index] = node; }} className="orrery-label-leader" aria-hidden="true" />
        ))}
      </div>
      <button
        ref={originRef}
        className={`orrery-origin ${selectedId === originArtifact.id ? "selected" : ""}`}
        onClick={() => onSelect(originArtifact)}
        onMouseEnter={() => { hoveredRef.current = originArtifact.id; }}
        onMouseLeave={() => { hoveredRef.current = null; }}
        onFocus={() => { hoveredRef.current = originArtifact.id; }}
        onBlur={() => { hoveredRef.current = null; }}
        aria-pressed={selectedId === originArtifact.id}
      >
        <strong>Origin</strong>
      </button>
      <nav className="orrery-ecliptic-index" aria-label="Ecliptic position readout">
        {artifacts.map((item, index) => (
          <a
            key={item.id}
            ref={(node) => { ringLabelRefs.current[index] = node; }}
            className={selectedId === item.id ? "selected" : ""}
            href={artifactHref(item)}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onNavigate(item);
            }}
            onMouseEnter={() => { hoveredRef.current = item.id; }}
            onMouseLeave={() => { hoveredRef.current = null; }}
            onFocus={() => { hoveredRef.current = item.id; }}
            onBlur={() => { hoveredRef.current = null; }}
          >
            <span aria-hidden="true" />
            {item.short}
          </a>
        ))}
      </nav>
      {selectedArtifact && <>
        <span ref={leaderRef} className="orrery-detail-leader visible" aria-hidden="true" />
        <aside ref={detailRef} className="orrery-world-detail visible" aria-live="polite">
          <button className="orrery-detail-close" type="button" onClick={onClear} aria-label="Close details">×</button>
          <p>{selectedArtifact.short}</p>
          <h2>{selectedArtifact.title}</h2>
          <p>{selectedArtifact.description}</p>
          <a
            href={artifactHref(selectedArtifact)}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onNavigate(selectedArtifact);
            }}
          >Open {selectedArtifact.short}</a>
          <small>{selectedArtifact.status}</small>
        </aside>
      </>}
    </div>
  );
}
