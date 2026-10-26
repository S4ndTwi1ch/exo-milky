/**
 * THREE.JS MISSION CONTROL MASTER COORDINATOR
 * Manages WebGL context, host-star point markers, overlap culling, and camera kinematics.
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
    this.onSelect = null;

    // Simulation Time Engine
    this.timeScale      = 1.0;
    this.simDaysElapsed = 0;
    this.startDate      = new Date(2026, 9, 26);

    // Selected object reference for priority
    this.selectedObject = null;

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
    this.camera = new THREE.PerspectiveCamera(55, this.canvas.clientWidth / this.canvas.clientHeight, 2, 8e6);

    // Subsystems
    this.starfield      = new Starfield(this.scene);
    this.galaxyRenderer = new GalaxyRenderer(this.scene);
    this.systemRenderer = new SystemRenderer(this.scene);
    this.camCtrl        = new CameraController(this.camera, this.canvas);

    // Build host star point markers (one small marker per host star)
    this._buildHostStarMarkers();

    window.addEventListener('resize', () => this._onResize());
    this.canvas.addEventListener('click', (e) => this._onClick(e));
    this.canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e));

    document.addEventListener('visibilitychange', () => {
      this.isPausedForHidden = document.hidden;
    });

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL Context Lost. Awaiting recovery...');
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL Context Restored.');
      this._onResize();
    });

    this._loop();
  }

  _buildHostStarMarkers() {
    this.hostStarMarkers = [];
    this.hostStarGroup = new THREE.Group();

    // 1. Group exoplanets by host star
    const hostMap = new Map();
    exoplanets.forEach((p) => {
      const h = p.hostStar || 'Unknown';
      if (!hostMap.has(h)) hostMap.set(h, []);
      hostMap.get(h).push(p);
    });

    // 2. Build one fixed on-screen size (6px, sizeAttenuation: false) marker per host star
    // Muted off-white/warm silver starlight color (no saturated green/blue)
    const markerMat = new THREE.PointsMaterial({
      size: 6,
      sizeAttenuation: false,
      color: 0xd4d4d8,
      transparent: true,
      opacity: 0.85
    });

    // Sol Host Star Marker
    const solGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
    const solMarker = new THREE.Points(solGeo, markerMat.clone());
    solMarker.position.copy(SUN_WORLD_POS);
    solMarker.userData = {
      isHostStar: true,
      isSol: true,
      name: 'Sol (Solar System)',
      hostStar: 'Sol',
      distanceLy: 0,
      planets: systems[0].planets,
      primaryPlanet: systems[0].planets.find(p => p.id === 'earth'),
      _worldPos: SUN_WORLD_POS.clone(),
      hasHabitable: true
    };
    this.hostStarGroup.add(solMarker);
    this.hostStarMarkers.push(solMarker);

    // Exoplanet Host Stars Markers
    for (const [starName, starPlanets] of hostMap.entries()) {
      const primaryPlanet = starPlanets.find(p => p.habitabilityStatus === 'habitable') || starPlanets[0];
      const pos = getExoWorldPos(primaryPlanet);
      if (!pos) continue;

      const pGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
      const marker = new THREE.Points(pGeo, markerMat.clone());
      marker.position.copy(pos);

      const hasHab = starPlanets.some(p => p.habitabilityStatus === 'habitable');
      marker.userData = {
        isHostStar: true,
        isSol: false,
        name: starName,
        hostStar: starName,
        distanceLy: primaryPlanet.distanceLy || 0,
        planets: starPlanets,
        primaryPlanet: primaryPlanet,
        _worldPos: pos,
        hasHabitable: hasHab
      };

      this.hostStarGroup.add(marker);
      this.hostStarMarkers.push(marker);
    }

    this.scene.add(this.hostStarGroup);
    // Backward-compatibility alias for HUD layer toggles
    this.exoMarkers = this.hostStarMarkers;
  }

  _cullOverlappingMarkers() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const isSystemView = (this.camCtrl.scaleLevel === SCALE.SYSTEM);

    // Project each host star to screen space
    const projected = [];
    this.hostStarMarkers.forEach((m) => {
      // If we are in system view, hide the marker of the current active system so it doesn't overlap 3D star
      if (isSystemView && this.camCtrl.target.distanceTo(m.position) < 500) {
        m.visible = false;
        return;
      }

      const p = m.position.clone().project(this.camera);
      const inFrustum = (p.z > 0 && p.z < 1 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1);

      if (!inFrustum) {
        m.visible = false;
        return;
      }

      const sx = (p.x * 0.5 + 0.5) * width;
      const sy = (-p.y * 0.5 + 0.5) * height;

      // Calculate priority: selected object > Sol > habitable > camera proximity
      const isSelected = (this.selectedObject && (this.selectedObject.name === m.userData.name || this.selectedObject.hostStar === m.userData.name));
      let priority = 0;
      if (isSelected) priority = 1000;
      else if (m.userData.isSol) priority = 900;
      else if (m.userData.hasHabitable) priority = 500;
      else priority = 100 - (m.userData.distanceLy || 0) * 0.01;

      projected.push({ marker: m, sx, sy, priority });
    });

    // Sort descending by priority
    projected.sort((a, b) => b.priority - a.priority);

    // 50% overlap rule: marker size is 6px, so if screen distance < 6px (50% overlap), hide the lower priority one
    const accepted = [];
    projected.forEach((item) => {
      let overlaps = false;
      for (const acc of accepted) {
        const dx = item.sx - acc.sx;
        const dy = item.sy - acc.sy;
        if (dx * dx + dy * dy < 36) { // 6px threshold
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        accepted.push(item);
        item.marker.visible = true;
      } else {
        item.marker.visible = false;
      }
    });
  }

  _onClick(e) {
    if (!this.onSelect) return;
    const hit = this._raycastHit(e);
    if (hit) {
      this.selectedObject = hit.userData;
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

    // Points hit threshold in screen pixels
    raycaster.params.Points = { threshold: 8 };

    // In System view, prioritize orbiting planet spheres
    if (this.camCtrl.scaleLevel === SCALE.SYSTEM) {
      const planetHits = raycaster.intersectObjects(this.systemRenderer.planets);
      if (planetHits.length > 0) return planetHits[0].object;
    }

    // Raycast visible host star markers
    const visibleMarkers = this.hostStarMarkers.filter(m => m.visible);
    const starHits = raycaster.intersectObjects(visibleMarkers);
    if (starHits.length > 0) {
      const obj = starHits[0].object;
      return {
        ...obj,
        userData: obj.userData.primaryPlanet || obj.userData
      };
    }

    return null;
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

    // 1. Advance simulation time & animations
    this.simDaysElapsed += dt * this.timeScale * 14.0;
    this.galaxyRenderer.update(dt, this.reducedMotion);
    this.systemRenderer.update(this.simDaysElapsed, dt, this.camera.position, this.camCtrl.scaleLevel);
    this.starfield.update(dt, this.reducedMotion);

    // 2. Camera kinematics
    this.camCtrl.update(dt);

    // 3. Screen-space overlap culling (>50% overlap hidden)
    this._cullOverlappingMarkers();

    // 4. Adaptive FPS Monitor
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1.0) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;

      if (this.fps < 45 && !this.isLowQuality) {
        this.isLowQuality = true;
        this.renderer.setPixelRatio(1.0);
      }
    }

    // 5. Render
    this.renderer.render(this.scene, this.camera);
  }

  flyToObject(obj) {
    if (!obj) return;
    this.selectedObject = obj;

    // Check if it's a Solar System planet
    const solPlanets = systems[0].planets.map(p => p.name.toLowerCase());
    const isSolPlanet = solPlanets.includes((obj.name || '').toLowerCase());

    if (isSolPlanet) {
      this.systemRenderer.loadSystem('sol');
      this.camCtrl.flyTo(SUN_WORLD_POS, 4.0, this.reducedMotion);
      return;
    }

    if (obj.isPlanet || obj.isHostStar || obj.name) {
      const hostStarName = obj.hostStar || obj.name || '';
      const marker = this.hostStarMarkers.find(m =>
        m.userData.name.toLowerCase() === hostStarName.toLowerCase() ||
        m.userData.hostStar.toLowerCase() === hostStarName.toLowerCase()
      );

      const pos = marker ? marker.position : (obj._worldPos || SUN_WORLD_POS);
      const matchingSys = systems.find(s => s.name.toLowerCase().includes(hostStarName.toLowerCase())) || systems[0];
      this.systemRenderer.loadSystem(matchingSys.id);
      this.camCtrl.flyTo(pos, 4.0, this.reducedMotion);
    }
  }

  flyToGalaxy() {
    this.camCtrl.flyTo(new THREE.Vector3(0, 0, 0), 0.2, this.reducedMotion);
  }

  flyToSol() {
    this.systemRenderer.loadSystem('sol');
    this.camCtrl.flyTo(SUN_WORLD_POS, 3.8, this.reducedMotion);
  }

  flyToEarth() {
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
