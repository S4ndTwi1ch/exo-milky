/**
 * PARALLAX DEEP SPACE STARFIELD
 * 3 distinct depth shells with spectral type distribution (O/B to M)
 * and GPU shader-based twinkle
 */
import * as THREE from 'three';

const STAR_VERT = `
  attribute float size;
  attribute vec3  color;
  attribute float phase;
  uniform   float time;
  uniform   float twinkleSpeed;
  varying   vec3  vColor;
  varying   float vAlpha;

  void main() {
    vColor = color;
    float tw = sin(time * twinkleSpeed + phase * 6.28318) * 0.5 + 0.5;
    vAlpha = 0.55 + 0.45 * tw;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (320.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const STAR_FRAG = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

// Spectral type colors (sRGB)
const SPECTRAL_COLORS = [
  [0.65, 0.78, 1.00], // O/B: Blue-White
  [0.82, 0.88, 1.00], // A:   White-Blue
  [0.98, 0.98, 0.95], // F:   Yellow-White
  [1.00, 0.94, 0.70], // G:   Yellow (Sol)
  [1.00, 0.80, 0.50], // K:   Orange
  [1.00, 0.55, 0.40], // M:   Red Dwarf
];

export class Starfield {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.uniforms = {
      time: { value: 0 },
      twinkleSpeed: { value: 2.2 },
    };
    this._build();
    scene.add(this.group);
  }

  _build() {
    // 3 shells of background stars
    const SHELLS = [
      { count: 4000, radius: 120000, minSize: 1.2, maxSize: 2.8 },
      { count: 3000, radius: 180000, minSize: 1.0, maxSize: 2.2 },
      { count: 2500, radius: 240000, minSize: 0.8, maxSize: 1.8 }
    ];

    SHELLS.forEach((shell) => {
      const N = shell.count;
      const positions = new Float32Array(N * 3);
      const colors    = new Float32Array(N * 3);
      const sizes     = new Float32Array(N);
      const phases    = new Float32Array(N);

      for (let i = 0; i < N; i++) {
        // Uniform sphere surface
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = shell.radius * (0.95 + Math.random() * 0.1);

        positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = r * Math.cos(phi);

        // Pick spectral color with IMF-like weighting (more M/K than O/B)
        const roll = Math.random();
        let cIdx = 5; // M
        if (roll < 0.03) cIdx = 0;      // O/B
        else if (roll < 0.10) cIdx = 1; // A
        else if (roll < 0.22) cIdx = 2; // F
        else if (roll < 0.42) cIdx = 3; // G
        else if (roll < 0.70) cIdx = 4; // K

        const c = SPECTRAL_COLORS[cIdx];
        colors[i*3]   = c[0];
        colors[i*3+1] = c[1];
        colors[i*3+2] = c[2];

        sizes[i]  = shell.minSize + Math.random() * (shell.maxSize - shell.minSize);
        phases[i] = Math.random();
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('phase',    new THREE.BufferAttribute(phases, 1));

      const mat = new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const points = new THREE.Points(geo, mat);
      this.group.add(points);
    });
  }

  update(dt, reducedMotion = false) {
    if (!reducedMotion) {
      this.uniforms.time.value += dt;
    }
  }

  setVisible(v) { this.group.visible = v; }
}
