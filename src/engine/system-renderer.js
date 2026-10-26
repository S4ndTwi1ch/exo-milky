/**
 * SYSTEM & LOCAL STELLAR RENDERER
 * Renders:
 * 1. Local stellar neighborhood stars with spectral class coloring
 * 2. Host stars with emissive corona shaders
 * 3. Keplerian planetary orbits in AU units
 * 4. Habitable Zone annular bands (calculated from stellar luminosity)
 * 5. Procedural planet shaders with:
 *    - Fresnel atmospheric rim glow
 *    - Day/night terminator from central star
 *    - Tidal locking terminator support (TRAPPIST-1e and Proxima b)
 *    - Planetary rings (Saturn, etc.)
 */
import * as THREE from 'three';
import systemsData from '../data/systems.json';
import exoplanetsData from '../data/exoplanets.json';
import { SUN_WORLD_POS } from './galaxy-renderer.js';

// Scale factor: 1 AU in local system view = 600 units
export const AU_SCALE = 600;

// Planet procedural shader with Fresnel atmosphere & Day/Night terminator
const PLANET_VERT = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const PLANET_FRAG = `
  uniform vec3  lightPos;
  uniform vec3  baseColor;
  uniform vec3  nightColor;
  uniform vec3  atmoColor;
  uniform float isTidallyLocked;
  uniform float lockedAngle;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying vec2  vUv;

  void main() {
    // Normal in world space
    vec3 N = normalize(vNormal);
    // Light direction from central star
    vec3 L = normalize(lightPos - vWorldPos);
    // View direction
    vec3 V = normalize(cameraPosition - vWorldPos);

    // Diffuse sunlight term
    float NdotL = dot(N, L);
    float dayFactor = clamp(NdotL * 1.2 + 0.1, 0.0, 1.0);

    // If tidally locked, daylight is permanently locked to one hemisphere
    if (isTidallyLocked > 0.5) {
      // Permanent sub-stellar point facing star
      dayFactor = clamp(NdotL * 1.5, 0.0, 1.0);
    }

    // Day side vs night side
    vec3 surface = mix(nightColor, baseColor, dayFactor);

    // Atmospheric Fresnel rim glow
    float fresnel = pow(1.0 - max(0.0, dot(V, N)), 2.8);
    vec3 finalColor = surface + atmoColor * fresnel * 0.85;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class SystemRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.activeSystemId = 'sol';
    this.systemMeshes = [];
    this.orbitLines   = [];
    this.hzRings      = [];
    this.starMarkers  = [];

    this._buildLocalStars();
    this.loadSystem('sol');
  }

  _buildLocalStars() {
    this.localStarsGroup = new THREE.Group();
    this.localStarsGroup.position.copy(SUN_WORLD_POS);

    systemsData.forEach(sys => {
      // Offset from Sol
      const dLy = sys.distanceLy || 0;
      const angle = (sys.raDeg || 0) * Math.PI / 180;
      const dec   = (sys.decDeg || 0) * Math.PI / 180;
      const x = dLy * Math.cos(dec) * Math.cos(angle);
      const y = dLy * Math.sin(dec);
      const z = dLy * Math.cos(dec) * Math.sin(angle);

      const colorHex = sys.color ? parseInt(sys.color.replace('#', '0x')) : 0xffffaa;
      const starGeo = new THREE.SphereGeometry(18, 12, 12);
      const starMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.set(x, y, z);
      starMesh.userData = { isStar: true, system: sys };

      this.localStarsGroup.add(starMesh);
      this.starMarkers.push(starMesh);
    });

    this.group.add(this.localStarsGroup);
  }

  loadSystem(systemId) {
    const sys = systemsData.find(s => s.id === systemId) || systemsData[0];
    this.activeSystem = sys;

    // Clean previous system meshes
    if (this.currentSystemGroup) {
      this.group.remove(this.currentSystemGroup);
    }

    this.currentSystemGroup = new THREE.Group();
    // Position system view at Sol or star position
    const dLy = sys.distanceLy || 0;
    const angle = (sys.raDeg || 0) * Math.PI / 180;
    const dec   = (sys.decDeg || 0) * Math.PI / 180;
    const sysWorldX = SUN_WORLD_POS.x + dLy * Math.cos(dec) * Math.cos(angle);
    const sysWorldY = SUN_WORLD_POS.y + dLy * Math.sin(dec);
    const sysWorldZ = SUN_WORLD_POS.z + dLy * Math.cos(dec) * Math.sin(angle);

    this.currentSystemGroup.position.set(sysWorldX, sysWorldY, sysWorldZ);

    // 1. Host Star in Center
    const starColor = sys.color ? parseInt(sys.color.replace('#', '0x')) : 0xffddaa;
    const starRadius = Math.max(28, (sys.radiusSolar || 1) * 35);
    const starMesh = new THREE.Mesh(
      new THREE.SphereGeometry(starRadius, 32, 32),
      new THREE.MeshBasicMaterial({ color: starColor })
    );
    this.currentSystemGroup.add(starMesh);
    this.hostStarMesh = starMesh;

    // Corona glow halo
    const coronaGeo = new THREE.RingGeometry(starRadius * 1.05, starRadius * 2.2, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: starColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    corona.rotation.x = Math.PI / 2;
    this.currentSystemGroup.add(corona);

    // 2. Habitable Zone Ring (Kasting et al. 1993 standard)
    const L = sys.luminositySolar || Math.pow(sys.massSolar || 1, 3.5);
    const hzInnerAu = 0.95 * Math.sqrt(L);
    const hzOuterAu = 1.68 * Math.sqrt(L);

    const hzGeo = new THREE.RingGeometry(hzInnerAu * AU_SCALE, hzOuterAu * AU_SCALE, 64);
    const hzMat = new THREE.MeshBasicMaterial({
      color: 0x22dd88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
      depthWrite: false
    });
    const hzMesh = new THREE.Mesh(hzGeo, hzMat);
    hzMesh.rotation.x = Math.PI / 2;
    this.currentSystemGroup.add(hzMesh);
    this.hzRings = [hzMesh];

    // 3. Orbits & Procedural Planets
    this.planets = [];
    this.orbitLines = [];

    (sys.planets || []).forEach(p => {
      const au = p.semiMajorAxisAu || 1.0;
      const orbitR = au * AU_SCALE;

      // Orbit path line
      const points = [];
      const segs = 96;
      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        points.push(new THREE.Vector3(orbitR * Math.cos(th), 0, orbitR * Math.sin(th)));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.35
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      this.currentSystemGroup.add(orbitLine);
      this.orbitLines.push(orbitLine);

      // Planet procedural sphere
      const planetR = Math.max(6, Math.min(22, (p.radiusEarth || 1.0) * 8));
      const pGeo = new THREE.SphereGeometry(planetR, 24, 24);

      const baseCol = new THREE.Color(p.color || '#4499ee');
      const nightCol = baseCol.clone().multiplyScalar(0.08);
      const isLocked = (p.id === 'proxima-b' || p.id === 'trappist-1e') ? 1.0 : 0.0;

      const pMat = new THREE.ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: PLANET_FRAG,
        uniforms: {
          lightPos: { value: this.currentSystemGroup.position },
          baseColor: { value: baseCol },
          nightColor: { value: nightCol },
          atmoColor: { value: new THREE.Color(0x38bdf8) },
          isTidallyLocked: { value: isLocked },
          lockedAngle: { value: 0 }
        }
      });

      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.userData = { ...p, orbitR, periodDays: p.periodDays || 365.25 };

      // Optional rings (e.g. Saturn)
      if (p.hasRings) {
        const ringG = new THREE.RingGeometry(planetR * 1.4, planetR * 2.3, 32);
        const ringM = new THREE.MeshBasicMaterial({
          color: 0xd9c49a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
        });
        const rings = new THREE.Mesh(ringG, ringM);
        rings.rotation.x = Math.PI / 2.4;
        pMesh.add(rings);
      }

      this.currentSystemGroup.add(pMesh);
      this.planets.push(pMesh);
    });

    this.group.add(this.currentSystemGroup);
  }

  update(simDays) {
    // Update planetary orbital positions based on Keplerian period
    this.planets.forEach(p => {
      const period = p.userData.periodDays || 365.25;
      const angle = (simDays / period) * Math.PI * 2;
      const r = p.userData.orbitR;
      p.position.set(r * Math.cos(angle), 0, r * Math.sin(angle));
      p.rotation.y = angle * 2;
    });
  }

  setOrbitsVisible(v) {
    this.orbitLines.forEach(l => { l.visible = v; });
  }

  setHabitableZoneVisible(v) {
    this.hzRings.forEach(r => { r.visible = v; });
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
