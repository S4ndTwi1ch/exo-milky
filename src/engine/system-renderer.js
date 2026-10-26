/**
 * SYSTEM & PLANETARY RENDERER
 * Renders:
 * - Planetary systems in AU units (Solar System & Exoplanet host stars)
 * - Lit planetary materials illuminated by central host star with thin rim glow
 * - Muted colors per planetary type (terrestrial, super-Earth, gas giant)
 * - Dynamic radius scaling guaranteeing no planet exceeds ~3% screen height
 */
import * as THREE from 'three';
import systemsData from '../data/systems.json';
import { SUN_WORLD_POS } from './galaxy-renderer.js';
import { SCALE } from './camera-controller.js';

export const AU_SCALE = 480;

// Lit material from host star + thin rim glow
const PLANET_VERT = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const PLANET_FRAG = `
  uniform vec3  starPos;
  uniform vec3  baseColor;
  uniform vec3  rimColor;

  varying vec3  vNormal;
  varying vec3  vWorldPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(starPos - vWorldPos);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // Lambertian illumination from host star
    float NdotL = max(0.0, dot(N, L));
    float ambient = 0.08;
    float diffuse = ambient + (1.0 - ambient) * NdotL;

    // Thin atmospheric rim glow
    float fresnel = pow(1.0 - max(0.0, dot(V, N)), 3.6);

    vec3 lit = baseColor * diffuse;
    vec3 rim = rimColor * (fresnel * 0.42);

    gl_FragColor = vec4(lit + rim, 1.0);
  }
`;

function getMutedColorByType(radiusEarth) {
  const r = radiusEarth || 1.0;
  if (r <= 1.25) {
    // Terrestrial: Muted rocky slate / weathered sandstone
    return { base: new THREE.Color(0x828d99), rim: new THREE.Color(0xaec0cf) };
  } else if (r <= 2.2) {
    // Super-Earth: Muted dusty bronze / sage
    return { base: new THREE.Color(0x948b7a), rim: new THREE.Color(0xbfb6a4) };
  } else {
    // Gas / Ice Giant: Muted warm sand / dusky ochre
    return { base: new THREE.Color(0x9a8e7e), rim: new THREE.Color(0xc2b5a3) };
  }
}

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

      // Muted stellar color
      const starGeo = new THREE.SphereGeometry(18, 12, 12);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d8 });
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

    const dLy = sys.distanceLy || 0;
    const angle = (sys.raDeg || 0) * Math.PI / 180;
    const dec   = (sys.decDeg || 0) * Math.PI / 180;
    const sysWorldX = SUN_WORLD_POS.x + dLy * Math.cos(dec) * Math.cos(angle);
    const sysWorldY = SUN_WORLD_POS.y + dLy * Math.sin(dec);
    const sysWorldZ = SUN_WORLD_POS.z + dLy * Math.cos(dec) * Math.sin(angle);

    this.currentSystemGroup.position.set(sysWorldX, sysWorldY, sysWorldZ);
    this.starWorldPos = new THREE.Vector3(sysWorldX, sysWorldY, sysWorldZ);

    // 1. Central Host Star
    const starRadius = Math.max(26, Math.min(48, (sys.radiusSolar || 1) * 32));
    const starMesh = new THREE.Mesh(
      new THREE.SphereGeometry(starRadius, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    this.currentSystemGroup.add(starMesh);
    this.hostStarMesh = starMesh;

    // Corona Radiant Glow Halo
    const coronaGeo = new THREE.RingGeometry(starRadius * 1.05, starRadius * 2.5, 36);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending
    });
    this.corona = new THREE.Mesh(coronaGeo, coronaMat);
    this.corona.rotation.x = Math.PI / 2;
    this.currentSystemGroup.add(this.corona);

    // 2. Habitable Zone Shaded Ring (muted sage/gold)
    const L = sys.luminositySolar || Math.pow(sys.massSolar || 1, 3.5);
    const hzInnerAu = 0.95 * Math.sqrt(L);
    const hzOuterAu = 1.68 * Math.sqrt(L);

    const hzGeo = new THREE.RingGeometry(hzInnerAu * AU_SCALE, hzOuterAu * AU_SCALE, 64);
    const hzMat = new THREE.MeshBasicMaterial({
      color: 0x6e8b7b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    const hzMesh = new THREE.Mesh(hzGeo, hzMat);
    hzMesh.rotation.x = Math.PI / 2;
    this.currentSystemGroup.add(hzMesh);
    this.hzRings = [hzMesh];

    // 3. Orbits & Planetary Spheres
    this.planets = [];
    this.orbitLines = [];

    (sys.planets || []).forEach((p) => {
      const au = p.semiMajorAxisAu || 1.0;
      const orbitR = au * AU_SCALE;

      // Orbit ellipse line (thin, muted)
      const points = [];
      const segs = 120;
      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        points.push(new THREE.Vector3(orbitR * Math.cos(th), 0, orbitR * Math.sin(th)));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.35
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      this.currentSystemGroup.add(orbitLine);
      this.orbitLines.push(orbitLine);

      // Planet radius: proportional to real Earth radii with clamped minimum
      const rEarth = p.radiusEarth || 1.0;
      const basePlanetR = Math.max(2.2, Math.min(8.5, rEarth * 2.2));
      const pGeo = new THREE.SphereGeometry(basePlanetR, 24, 24);

      // Muted colors by type (terrestrial, super-Earth, gas giant)
      const { base, rim } = getMutedColorByType(rEarth);

      const pMat = new THREE.ShaderMaterial({
        vertexShader: PLANET_VERT,
        fragmentShader: PLANET_FRAG,
        uniforms: {
          starPos: { value: this.starWorldPos },
          baseColor: { value: base },
          rimColor: { value: rim }
        }
      });

      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.userData = {
        ...p,
        orbitR,
        basePlanetR,
        periodDays: p.periodDays || 365.25,
        rotSpeed: 0.3 + Math.random() * 0.5
      };

      // Rings (Saturn / Uranus)
      if (p.hasRings) {
        const inner = basePlanetR * 1.35;
        const outer = basePlanetR * 2.3;
        const ringG = new THREE.RingGeometry(inner, outer, 48);
        const ringM = new THREE.MeshBasicMaterial({
          color: 0xb5a995,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
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

  update(simDays, dt, cameraPos, scaleLevel) {
    // 1. Planet spheres & orbits only appear in SYSTEM view when close
    const isSystemView = (scaleLevel === SCALE.SYSTEM);
    if (this.currentSystemGroup) {
      this.currentSystemGroup.visible = isSystemView;
    }

    if (!isSystemView) return;

    // 2. Corona slow rotation
    if (this.corona) {
      this.corona.rotation.z += dt * 0.05;
    }

    // 3. Keplerian orbital motion & screen-height clamp
    this.planets.forEach((p) => {
      const period = p.userData.periodDays || 365.25;
      const angle = (simDays / period) * Math.PI * 2;
      const r = p.userData.orbitR;

      p.position.set(r * Math.cos(angle), 0, r * Math.sin(angle));
      p.rotation.y += dt * p.userData.rotSpeed;

      // Ensure no planet exceeds ~3% of screen height at any zoom
      if (cameraPos) {
        const pWorld = new THREE.Vector3();
        p.getWorldPosition(pWorld);
        const distToCam = pWorld.distanceTo(cameraPos);
        // At FOV 55, screen height in world units is ~1.04 * distToCam. 3% is ~0.031 * distToCam.
        // Planet radius must be <= 0.0155 * distToCam
        const maxAllowedR = Math.max(1.5, distToCam * 0.015);
        const baseR = p.userData.basePlanetR;
        const clampedR = Math.min(baseR, maxAllowedR);
        const s = clampedR / baseR;
        p.scale.set(s, s, s);
      }
    });
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
