/**
 * GALAXY PARTICLE RENDERER
 * 4 logarithmic spiral arms, dust lanes, barred bulge,
 * rotating Sgr A* accretion disk, and pulsing Sol marker.
 */
import * as THREE from 'three';

const VERT = `
  attribute float size;
  attribute vec3  color;
  varying   vec3  vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (440.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const FRAG = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a * 0.94);
  }
`;

export const SUN_GC_LY = 8178 * 3.26156; // 26,673 ly
export const SUN_WORLD_POS = new THREE.Vector3(SUN_GC_LY, 0, 0);

const ARM_COLORS = [
  [0.72, 0.82, 1.00], // Perseus
  [0.65, 0.74, 0.98], // Scutum-Centaurus
  [0.80, 0.85, 1.00], // Sagittarius-Carina
  [0.68, 0.78, 0.95], // Outer / Norma
];

function spiralPos(t, spread, armAngleOffset) {
  const PITCH = 0.22;
  const r = 900 + t * 48000;
  const theta = t * 5.2 + armAngleOffset + PITCH * Math.log(r / 900 + 1);
  const scatter = (Math.random() - 0.5) * spread * (0.35 + t * 0.8);
  const x = (r + scatter) * Math.cos(theta);
  const y = (Math.random() - 0.5) * 260 * (1 - t * 0.6);
  const z = (r + scatter) * Math.sin(theta);
  return [x, y, z];
}

export class GalaxyRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.time = 0;
    this._build();
  }

  _build() {
    const N = 36000;
    const positions = new Float32Array(N * 3);
    const colors    = new Float32Array(N * 3);
    const sizes     = new Float32Array(N);

    let idx = 0;
    const ARMS = 4;
    const perArm = Math.floor(N * 0.65 / ARMS);

    // 1. Spiral Arms with Dust Lanes and HII regions
    for (let a = 0; a < ARMS; a++) {
      const angleOff = (a / ARMS) * Math.PI * 2;
      const c = ARM_COLORS[a];
      for (let i = 0; i < perArm; i++) {
        const t = i / perArm;
        const [x, y, z] = spiralPos(t, 3200, angleOff);
        positions[idx*3]   = x;
        positions[idx*3+1] = y;
        positions[idx*3+2] = z;

        const isDust = Math.random() < 0.14;
        if (isDust) {
          colors[idx*3]   = 0.24 + Math.random() * 0.08;
          colors[idx*3+1] = 0.18 + Math.random() * 0.05;
          colors[idx*3+2] = 0.14;
          sizes[idx] = 1.1;
        } else {
          const isHII = Math.random() < 0.06;
          if (isHII) {
            colors[idx*3]   = 0.95;
            colors[idx*3+1] = 0.42;
            colors[idx*3+2] = 0.68;
            sizes[idx] = 2.5;
          } else {
            colors[idx*3]   = c[0] + (Math.random() - 0.5) * 0.06;
            colors[idx*3+1] = c[1] + (Math.random() - 0.5) * 0.06;
            colors[idx*3+2] = c[2] + (Math.random() - 0.5) * 0.04;
            sizes[idx] = 1.3 + Math.random() * 2.2;
          }
        }
        idx++;
      }
    }

    // 2. Dense Barred Central Bulge
    const bulgeN = Math.floor(N * 0.24);
    for (let i = 0; i < bulgeN && idx < N; i++) {
      const r = Math.pow(Math.random(), 2.2) * 6500;
      const theta = Math.random() * Math.PI * 2;
      const barFactor = 1.35 * Math.cos(theta);
      positions[idx*3]   = (r + barFactor * 800) * Math.cos(theta);
      positions[idx*3+1] = (Math.random() - 0.5) * 1600 * (1 - r / 6500);
      positions[idx*3+2] = r * Math.sin(theta);

      const warm = 0.82 + Math.random() * 0.18;
      colors[idx*3]   = warm;
      colors[idx*3+1] = warm * 0.76;
      colors[idx*3+2] = warm * 0.45;
      sizes[idx] = 1.7 + Math.random() * 2.5;
      idx++;
    }

    // 3. Galactic Halo
    while (idx < N) {
      const r = 6000 + Math.random() * 45000;
      const theta = Math.random() * Math.PI * 2;
      positions[idx*3]   = r * Math.cos(theta);
      positions[idx*3+1] = (Math.random() - 0.5) * 2200;
      positions[idx*3+2] = r * Math.sin(theta);

      colors[idx*3]   = 0.65 + Math.random() * 0.15;
      colors[idx*3+1] = 0.70 + Math.random() * 0.15;
      colors[idx*3+2] = 0.88 + Math.random() * 0.10;
      sizes[idx] = 1.0;
      idx++;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);

    // 4. Sgr A* Accretion Ring
    const ringGeo = new THREE.RingGeometry(420, 1600, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    this.sgrRing = new THREE.Mesh(ringGeo, ringMat);
    this.sgrRing.rotation.x = Math.PI / 2;
    this.group.add(this.sgrRing);

    // Sgr A* event horizon shadow & glow
    const sgrCore = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.95 })
    );
    this.group.add(sgrCore);

    // 5. Persistent Sol ("YOU ARE HERE") Marker
    this.solGroup = new THREE.Group();
    this.solGroup.position.copy(SUN_WORLD_POS);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(150, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffbb })
    );
    this.solGroup.add(sunMesh);

    const beaconGeo = new THREE.RingGeometry(200, 320, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.solBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.solBeacon.rotation.x = Math.PI / 2;
    this.solGroup.add(this.solBeacon);

    // Leader line to Sgr A*
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-SUN_GC_LY, 0, 0)
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 400,
      gapSize: 200,
      transparent: true,
      opacity: 0.4
    });
    const leaderLine = new THREE.Line(lineGeo, lineMat);
    leaderLine.computeLineDistances();
    this.solGroup.add(leaderLine);

    this.group.add(this.solGroup);
  }

  update(dt, reducedMotion = false) {
    if (reducedMotion) return;
    this.time += dt;

    // Slow majestic cosmic spiral rotation
    if (this.points) {
      this.points.rotation.y += dt * 0.016;
    }

    // Accretion disk relativistic spin
    if (this.sgrRing) {
      this.sgrRing.rotation.z += dt * 0.09;
    }

    // Sol beacon breathing pulsation
    if (this.solBeacon) {
      const pulse = 1.0 + 0.15 * Math.sin(this.time * 2.8);
      this.solBeacon.scale.set(pulse, pulse, pulse);
    }
  }

  setVisible(v) { this.group.visible = v; }
}
