/**
 * GALAXY PARTICLE RENDERER
 * 4 logarithmic spiral arms, dust lanes, barred central bulge,
 * Sgr A* black hole accretion disk, and persistent Sol ("YOU ARE HERE") marker.
 */
import * as THREE from 'three';

const VERT = `
  attribute float size;
  attribute vec3  color;
  varying   vec3  vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (420.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const FRAG = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a * 0.92);
  }
`;

// IAU 2016 standard: Sol distance from Sgr A* ~ 8,178 pc * 3.26156 ly/pc = 26,673 ly
export const SUN_GC_LY = 8178 * 3.26156;
export const SUN_WORLD_POS = new THREE.Vector3(SUN_GC_LY, 0, 0);

const ARM_COLORS = [
  [0.72, 0.82, 1.00], // Perseus Arm
  [0.65, 0.74, 0.98], // Scutum-Centaurus Arm
  [0.80, 0.85, 1.00], // Sagittarius-Carina Arm
  [0.68, 0.78, 0.95], // Outer / Norma Arm
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

    // 1. Spiral arms
    for (let a = 0; a < ARMS; a++) {
      const angleOff = (a / ARMS) * Math.PI * 2;
      const c = ARM_COLORS[a];
      for (let i = 0; i < perArm; i++) {
        const t = i / perArm;
        const [x, y, z] = spiralPos(t, 3200, angleOff);
        positions[idx*3]   = x;
        positions[idx*3+1] = y;
        positions[idx*3+2] = z;

        // Dust lane contrast (inner arm edge is slightly darker/warmer)
        const isDust = Math.random() < 0.15;
        if (isDust) {
          colors[idx*3]   = 0.24 + Math.random() * 0.08;
          colors[idx*3+1] = 0.18 + Math.random() * 0.05;
          colors[idx*3+2] = 0.14;
          sizes[idx] = 1.0;
        } else {
          // Young luminous OB stars & HII nebula pink/blue tints
          const isHII = Math.random() < 0.06;
          if (isHII) {
            colors[idx*3]   = 0.95;
            colors[idx*3+1] = 0.42;
            colors[idx*3+2] = 0.65;
            sizes[idx] = 2.4;
          } else {
            colors[idx*3]   = c[0] + (Math.random() - 0.5) * 0.06;
            colors[idx*3+1] = c[1] + (Math.random() - 0.5) * 0.06;
            colors[idx*3+2] = c[2] + (Math.random() - 0.5) * 0.04;
            sizes[idx] = 1.2 + Math.random() * 2.2;
          }
        }
        idx++;
      }
    }

    // 2. Dense barred central bulge
    const bulgeN = Math.floor(N * 0.24);
    for (let i = 0; i < bulgeN && idx < N; i++) {
      const r = Math.pow(Math.random(), 2.2) * 6500;
      const theta = Math.random() * Math.PI * 2;
      // Bar-elongation along theta = ~45 deg
      const barFactor = 1.35 * Math.cos(theta);
      positions[idx*3]   = (r + barFactor * 800) * Math.cos(theta);
      positions[idx*3+1] = (Math.random() - 0.5) * 1600 * (1 - r / 6500);
      positions[idx*3+2] = r * Math.sin(theta);

      const warm = 0.82 + Math.random() * 0.18;
      colors[idx*3]   = warm;
      colors[idx*3+1] = warm * 0.76;
      colors[idx*3+2] = warm * 0.45;
      sizes[idx] = 1.6 + Math.random() * 2.6;
      idx++;
    }

    // 3. Galactic Halo & Globular background
    while (idx < N) {
      const r = 6000 + Math.random() * 45000;
      const theta = Math.random() * Math.PI * 2;
      positions[idx*3]   = r * Math.cos(theta);
      positions[idx*3+1] = (Math.random() - 0.5) * 2200;
      positions[idx*3+2] = r * Math.sin(theta);

      colors[idx*3]   = 0.65 + Math.random() * 0.15;
      colors[idx*3+1] = 0.70 + Math.random() * 0.15;
      colors[idx*3+2] = 0.88 + Math.random() * 0.10;
      sizes[idx] = 0.9;
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

    // 4. Sagittarius A* Radio Source & Accretion Disk
    const sgrCore = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.95 })
    );
    sgrCore.position.set(0, 0, 0);
    this.group.add(sgrCore);

    // Accretion disk ring
    const ringGeo = new THREE.RingGeometry(400, 1400, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const sgrRing = new THREE.Mesh(ringGeo, ringMat);
    sgrRing.rotation.x = Math.PI / 2;
    this.group.add(sgrRing);

    // 5. Persistent Sol Marker ("YOU ARE HERE")
    this._buildSolMarker();
  }

  _buildSolMarker() {
    this.solGroup = new THREE.Group();
    this.solGroup.position.copy(SUN_WORLD_POS);

    // Glowing sun sphere
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(140, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 1.0 })
    );
    this.solGroup.add(sunMesh);

    // Concentric pulse beacon
    const beaconGeo = new THREE.RingGeometry(180, 260, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.rotation.x = Math.PI / 2;
    this.solGroup.add(beacon);

    // Thin leader line from Sol down to Galactic plane / center
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-SUN_GC_LY, 0, 0) // vector pointing to Sgr A*
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x5588cc,
      dashSize: 400,
      gapSize: 200,
      transparent: true,
      opacity: 0.35
    });
    const leaderLine = new THREE.Line(lineGeo, lineMat);
    leaderLine.computeLineDistances();
    this.solGroup.add(leaderLine);

    this.group.add(this.solGroup);
  }

  setVisible(v) { this.group.visible = v; }
}
