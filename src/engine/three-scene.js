/**
 * THREE.JS MISSION CONTROL MASTER COORDINATOR
 * Manages WebGL context, adaptive LOD, raycasting, simulation time engine,
 * layers, and cross-scale transitions.
 */
import * as THREE from 'three';
import { CameraController, SCALE } from './camera-controller.js';
import { GalaxyRenderer, SUN_WORLD_POS, SUN_GC_LY } from './galaxy-renderer.js';
import { SystemRenderer } from './system-renderer.js';
import { Starfield } from './starfield.js';
import { equatorialToGalactic } from './coordinates.js';
import exoplanets from '../data/exoplanets.json';
import systems from '../data/systems.json';

function getExoWorldPos(planet) {
  if (!planet.raDeg || !planet.decDeg || !planet.distanceLy) return null;
  const { l, b } = equatorialToGalactic(planet.raDeg, planet.decDeg);
  const DEG = Math.PI / 180;
  const ly  = planet.distanceLy;
  const dx = ly * Math.cos(b * DEG) * Math.cos(l * DEG);
  const dy = ly * Math.sin(b * DEG);
  const dz = ly * Math.cos(b * DEG) * Math.sin(l * DEG);
  return new THREE.Vector3(SUN_WORLD_POS.x + dx, dy, SUN_WORLD_POS.z + dz);
}

export class MissionControlScene {
  constructor(canvas) {
    this.canvas   = canvas;
    this.clock    = new THREE.Clock();
    this.onSelect = null; // callback(planet/object)

    // Simulation Time Engine
    this.timeScale      = 1.0;   // 0 (paused), 1x, 10x, 100x, 1000x, -10x
    this.simDaysElapsed = 0;
    this.startDate      = new Date(2026, 9, 26); // Oct 26, 2026

    // Adaptive Performance Monitor
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.isLowQuality = false;
    this.isPausedForHidden = false;
    this.reducedMotion = false;

    this._init();
  }

  _init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._onResize();

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, this.canvas.clientWidth / this.canvas.clientHeight, 2, 6e6);

    // Sub-systems
    this.starfield      = new Starfield(this.scene);
    this.galaxyRenderer = new GalaxyRenderer(this.scene);
    this.systemRenderer = new SystemRenderer(this.scene);
    this.camCtrl        = new CameraController(this.camera, this.canvas);

    this._buildExoMarkers();

    // Event Listeners
    window.addEventListener('resize', () => this._onResize());
    this.canvas.addEventListener('click', e => this._onClick(e));
    this.canvas.addEventListener('dblclick', e => this._onDoubleClick(e));

    // Handle Tab Visibility to save battery
    document.addEventListener('visibilitychange', () => {
      this.isPausedForHidden = document.hidden;
    });

    // WebGL Context recovery
    this.canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      console.warn('WebGL Context Lost. Awaiting restoration...');
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL Context Restored.');
      this._onResize();
    });

    this._loop();
  }

  _buildExoMarkers() {
    this.exoMarkers = [];
    const geo = new THREE.SphereGeometry(120, 10, 10);

    exoplanets.forEach(p => {
      const pos = getExoWorldPos(p);
      if (!pos) return;
      const isHabitable = p.habitabilityStatus === 'habitable';
      const color = isHabitable ? 0x10b981 : 0x38bdf8;
      const mesh = new THREE.Mesh(geo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      );
      mesh.position.copy(pos);
      mesh.userData = { ...p, _worldPos: pos, isPlanet: true };
      this.scene.add(mesh);
      this.exoMarkers.push(mesh);
    });
  }

  _onClick(e) {
    if (!this.onSelect) return;
    const hit = this._raycastHit(e);
    if (hit) {
      this.onSelect(hit.userData);
    }
  }

  _onDoubleClick(e) {
    const hit = this._raycastHit(e);
    if (hit) {
      this.flyToObject(hit.userData);
    }
  }

  _raycastHit(e) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc  = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    raycaster.params.Mesh = { threshold: 400 };

    // Raycast exoplanet markers + local stars
    const targets = [...this.exoMarkers, ...this.systemRenderer.starMarkers];
    const hits = raycaster.intersectObjects(targets);
    return hits.length > 0 ? hits[0].object : null;
  }

  _onResize() {
    const w = this.canvas.clientWidth  || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(w, h, false);
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    if (this.isPausedForHidden) return;

    const dt = this.clock.getDelta();

    // 1. Advance simulation time
    this.simDaysElapsed += dt * this.timeScale * 12.0; // 1 second real-time = 12 simulated days at 1x
    this.systemRenderer.update(this.simDaysElapsed);
    this.starfield.update(dt, this.reducedMotion);

    // 2. Camera kinematics
    this.camCtrl.update(dt);

    // 3. Adaptive FPS Monitor
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1.0) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;

      // Auto step down if FPS drops below 45
      if (this.fps < 45 && !this.isLowQuality) {
        this.isLowQuality = true;
        this.renderer.setPixelRatio(1.0);
        console.warn('FPS below 45: Stepping down to performance quality.');
      }
    }

    // 4. Render
    this.renderer.render(this.scene, this.camera);
  }

  flyToObject(obj) {
    if (!obj) return;
    if (obj.isPlanet || obj.name) {
      const marker = this.exoMarkers.find(m => m.userData.name === obj.name);
      if (marker) {
        // Load system if available
        const hostStar = obj.hostStar || '';
        const matchingSys = systems.find(s => s.name.toLowerCase().includes(hostStar.toLowerCase())) || systems[0];
        this.systemRenderer.loadSystem(matchingSys.id);
        this.camCtrl.flyTo(marker.position, 4.2, this.reducedMotion);
      } else {
        // Star or feature
        const pos = obj._worldPos || SUN_WORLD_POS;
        this.camCtrl.flyTo(pos, 3.2, this.reducedMotion);
      }
    }
  }

  flyToGalaxy() {
    this.camCtrl.flyTo(new THREE.Vector3(0, 0, 0), 0.2, this.reducedMotion);
  }

  flyToSol() {
    this.systemRenderer.loadSystem('sol');
    this.camCtrl.flyTo(SUN_WORLD_POS, 4.4, this.reducedMotion);
  }

  flyToSgrA() {
    this.camCtrl.flyTo(new THREE.Vector3(0, 0, 0), 2.2, this.reducedMotion);
  }

  setTimeScale(scale) {
    this.timeScale = scale;
  }

  setReducedMotion(v) {
    this.reducedMotion = v;
  }
}
