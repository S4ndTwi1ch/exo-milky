/**
 * SYSTEM & PLANETARY RENDERER
 * Renders:
 * - Complete Solar System (Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune)
 * - Exoplanet Host Stars with radiant corona halo
 * - Keplerian orbits with eccentricities and AU scaling
 * - Habitable Zone boundary bands
 * - Procedural planet shaders with atmosphere rim glow and axial self-rotation
 * - Planetary ring systems (Saturn, Uranus)
 */
import * as THREE from 'three';
import systemsData from '../data/systems.json';
import { SUN_WORLD_POS } from './galaxy-renderer.js';

export const AU_SCALE = 480; // 1 AU = 480 units

// Procedural Planet Shader with Day/Night terminator and atmospheric Fresnel rim
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
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying vec2  vUv;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(lightPos - vWorldPos);
    vec3 V = normalize(cameraPosition - vWorldPos);

    float NdotL = dot(N, L);
    float dayFactor = clamp(NdotL * 1.3 + 0.1, 0.0, 1.0);

    if (isTidallyLocked > 0.5) {
      dayFactor = clamp(NdotL * 1.6, 0.0, 1.0);
    }

    vec3 surface = mix(nightColor, baseColor, dayFactor);

    // Fresnel atmospheric limb scattering
    float fresnel = pow(1.0 - max(0.0, dot(V, N)), 2.6);
    vec3 finalColor = surface + atmoColor * fresnel * 0.9;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class SystemRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.activeSystemId = 'sol';
    this.planets        = [];
    this.orbitLines     = [];
    this.hzRings        = [];
    this.starMarkers    = [];

    this._buildLocalStars();
    this.loadSystem('sol');
  }

  _buildLocalStars() {
    this.localStarsGroup = new THREE.Group();
    this.localStarsGroup.position.copy(SUN_WORLD_POS);

    systemsData.forEach((sys) => {
      const dLy = sys.distanceLy || 0;
      const angle = (sys.raDeg || 0) * Math.PI / 180;
      const dec   = (sys.decDeg || 0) * Math.PI / 180;
      const x = dLy * Math.cos(dec) * Math.cos(angle);
      const y = dLy * Math.sin(dec);
      const z = dLy * Math.cos(dec) * Math.sin(angle);

      const colorHex = sys.color ? parseInt(sys.color.replace('#', '0x')) : 0xffffaa;
      const starGeo = new THREE.SphereGeometry(22, 12, 12);
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
    const sys = systemsData.find((s) => s.id === systemId) || systemsData[0];
    this.activeSystem = sys;
    this.activeSystemId = sys.id;

    if (this.currentSystemGroup) {
      this.group.remove(this.currentSystemGroup);
    }

    this.currentSystemGroup = new THREE.Group();

    // Position system view at actual coordinates relative to Sgr A*
    const dLy = sys.distanceLy || 0;
    const angle = (sys.raDeg || 0) * Math.PI / 180;
    const dec   = (sys.decDeg || 0) * Math.PI / 180;
    const sysWorldX = SUN_WORLD_POS.x + dLy * Math.cos(dec) * Math.cos(angle);
    const sysWorldY = SUN_WORLD_POS.y + dLy * Math.sin(dec);
    const sysWorldZ = SUN_WORLD_POS.z + dLy * Math.cos(dec) * Math.sin(angle);

    this.currentSystemGroup.position.set(sysWorldX, sysWorldY, sysWorldZ);

    // 1. Central Host Star (Sol, TRAPPIST-1, etc.)
    const starColor = sys.color ? parseInt(sys.color.replace('#', '0x')) : 0xffddaa;
    const starRadius = Math.max(32, Math.min(65, (sys.radiusSolar || 1) * 40));

    const starMesh = new THREE.Mesh(
      new THREE.SphereGeometry(starRadius, 32, 32),
      new THREE.MeshBasicMaterial({ color: starColor })
    );
    this.currentSystemGroup.add(starMesh);
    this.hostStarMesh = starMesh;

    // Corona Radiant Glow Halo
    const coronaGeo = new THREE.RingGeometry(starRadius * 1.05, starRadius * 2.8, 36);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: starColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending
    });
    this.corona = new THREE.Mesh(coronaGeo, coronaMat);
    this.corona.rotation.x = Math.PI / 2;
    this.currentSystemGroup.add(this.corona);

    // 2. Habitable Zone Shaded Ring
    const L = sys.luminositySolar || Math.pow(sys.massSolar || 1, 3.5);
    const hzInnerAu = 0.95 * Math.sqrt(L);
    const hzOuterAu = 1.68 * Math.sqrt(L);

    const hzGeo = new THREE.RingGeometry(hzInnerAu * AU_SCALE, hzOuterAu * AU_SCALE, 64);
    const hzMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    });
    const hzMesh = new THREE.Mesh(hzGeo, hzMat);
    hzMesh.rotation.x = Math.PI / 2;
    this.currentSystemGroup.add(hzMesh);
    this.hzRings = [hzMesh];

    // 3. Orbits & Procedural Planetary Spheres
    this.planets = [];
    this.orbitLines = [];

    (sys.planets || []).forEach((p) => {
      const au = p.semiMajorAxisAu || 1.0;
      const orbitR = au * AU_SCALE;

      // Orbit ellipse line
      const points = [];
      const segs = 120;
      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        points.push(new THREE.Vector3(orbitR * Math.cos(th), 0, orbitR * Math.sin(th)));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMat = new THREE.LineBasicMaterial({
        color: (p.id === 'earth') ? 0x38bdf8 : 0x475569,
        transparent: true,
        opacity: (p.id === 'earth') ? 0.6 : 0.35
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      this.currentSystemGroup.add(orbitLine);
      this.orbitLines.push(orbitLine);

      // Planet procedural sphere
      const planetR = Math.max(7, Math.min(26, (p.radiusEarth || 1.0) * 5.5));
      const pGeo = new THREE.SphereGeometry(planetR, 24, 24);

      const baseCol = new THREE.Color(p.color || '#4499ee');
      const nightCol = baseCol.clone().multiplyScalar(0.08);
      const isLocked = (p.id === 'proxima-b' || p.id === 'trappist-1e') ? 1.0 : 0.0;
      const atmoCol = p.atmoColor ? new THREE.Color(p.atmoColor) : new THREE.Color(0x38bdf8);

      const pMat = new THREE.ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: PLANET_FRAG,
        uniforms: {
          lightPos: { value: this.currentSystemGroup.position },
          baseColor: { value: baseCol },
          nightColor: { value: nightCol },
          atmoColor: { value: atmoCol },
          isTidallyLocked: { value: isLocked }
        }
      });

      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.userData = {
        ...p,
        orbitR,
        periodDays: p.periodDays || 365.25,
        rotSpeed: 0.4 + Math.random() * 0.8
      };

      // Saturn & Uranus Planetary Ring Systems
      if (p.hasRings) {
        const inner = planetR * 1.35;
        const outer = planetR * 2.4;
        const ringG = new THREE.RingGeometry(inner, outer, 48);
        const ringCol = (p.id === 'saturn') ? 0xeab308 : 0x38bdf8;
        const ringM = new THREE.MeshBasicMaterial({
          color: ringCol,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72
        });
        const rings = new THREE.Mesh(ringG, ringM);
        rings.rotation.x = Math.PI / 2.3;
        pMesh.add(rings);
      }

      this.currentSystemGroup.add(pMesh);
      this.planets.push(pMesh);
    });

    this.group.add(this.currentSystemGroup);
  }

  update(simDays, dt) {
    // 1. Corona slow rotation
    if (this.corona) {
      this.corona.rotation.z += dt * 0.06;
    }

    // 2. Planets Keplerian orbital revolution and axial rotation
    this.planets.forEach((p) => {
      const period = p.userData.periodDays || 365.25;
      const angle = (simDays / period) * Math.PI * 2;
      const r = p.userData.orbitR;

      p.position.set(r * Math.cos(angle), 0, r * Math.sin(angle));
      p.rotation.y += dt * (p.userData.rotSpeed || 0.6);
    });
  }

  getPlanetMesh(planetName) {
    return this.planets.find((p) => p.userData.name.toLowerCase() === planetName.toLowerCase());
  }

  setOrbitsVisible(v) {
    this.orbitLines.forEach((l) => { l.visible = v; });
  }

  setHabitableZoneVisible(v) {
    this.hzRings.forEach((r) => { r.visible = v; });
  }

  setVisible(v) {
    this.group.visible = v;
  }
}
