/**
 * MISSION CONTROL HUD CONTROLLER
 * Full interactive telemetry HUD:
 * - Top Bar: Live UTC clock, scale level pill indicators, FPS/quality readout, scale ruler
 * - Left Panel: Searchable, categorized object tree (Galaxy Features, Star Systems, Exoplanets)
 * - Right Panel: Detailed scientific dossier with provenance attribution and deep links
 * - Bottom Bar: Real-time celestial readouts (Galactic l/b, D_Sol, XYZ), simulation time scrubber,
 *   layer toggles, 2D galactic radar minimap
 * - Mobile Drawer navigation for screens < 900px
 */
import exoplanets from '../data/exoplanets.json';
import systems from '../data/systems.json';
import { formatGalacticCoords } from '../engine/coordinates.js';
import { SUN_GC_LY } from '../engine/galaxy-renderer.js';
import { SCALE } from '../engine/camera-controller.js';

export class HudController {
  constructor(scene) {
    this.scene = scene;
    this.activeCategory = 'all';

    // Hook selection callback
    scene.onSelect = (item) => this.openInspector(item);

    // Bind DOM components
    this._initTopBar();
    this._initObjectTree();
    this._initInspector();
    this._initBottomTelemetry();
    this._initTimeEngine();
    this._initLayerToggles();
    this._initMinimap();
    this._initMobileDrawers();
    this._initKeyboardShortcuts();
  }

  // -----------------------------------------------------------
  // Top Bar: Clock, Scale Levels, FPS, Scale Ruler
  // -----------------------------------------------------------
  _initTopBar() {
    const clockEl = document.getElementById('mc-utc-clock');
    const scaleBadges = document.querySelectorAll('.scale-pill');
    const fpsEl = document.getElementById('mc-fps');
    const rulerEl = document.getElementById('mc-ruler-val');

    // Update UTC clock every second
    setInterval(() => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      }
    }, 1000);

    // Update FPS readout
    setInterval(() => {
      if (fpsEl && this.scene) {
        const qTag = this.scene.isLowQuality ? 'PERF' : 'ULTRA';
        fpsEl.textContent = `${this.scene.fps || 60} FPS · ${qTag}`;
      }
    }, 1000);

    // Scale level change event from camera
    this.scene.canvas.addEventListener('scalelevelchange', (e) => {
      const { scaleLevel, logZoom } = e.detail;
      scaleBadges.forEach((badge) => {
        const lvl = parseInt(badge.dataset.scale);
        badge.classList.toggle('active', lvl === scaleLevel);
      });

      // Update Scale Ruler text
      if (rulerEl) {
        if (scaleLevel === SCALE.GALAXY) {
          rulerEl.textContent = '100,000 ly (~30.6 kpc)';
        } else if (scaleLevel === SCALE.LOCAL) {
          rulerEl.textContent = '50 ly (~15.3 pc)';
        } else {
          rulerEl.textContent = '5 AU (~748 Gm)';
        }
      }
    });
  }

  // -----------------------------------------------------------
  // Left Panel: Search & Categorized Object Tree
  // -----------------------------------------------------------
  _initObjectTree() {
    const searchInput = document.getElementById('hud-search');
    const categoryTabs = document.querySelectorAll('.tree-tab-btn');

    categoryTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        categoryTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.dataset.cat;
        this._renderTree();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => this._renderTree());
    }

    this._renderTree();
  }

  _renderTree() {
    const tree = document.getElementById('hud-object-tree');
    const searchInput = document.getElementById('hud-search');
    if (!tree) return;

    const q = (searchInput?.value || '').toLowerCase().trim();
    tree.innerHTML = '';

    // 1. Galaxy Features
    const galaxyFeatures = [
      { id: 'sgra', name: 'Sagittarius A*', type: 'Supermassive Black Hole', distanceLy: 0, isGC: true },
      { id: 'sol-star', name: 'Sol (Solar System)', type: 'G2V Main Sequence', distanceLy: 26673, isSol: true },
      { id: 'orion-arm', name: 'Orion-Cygnus Arm', type: 'Galactic Spiral Spur', distanceLy: 26673 },
      { id: 'perseus-arm', name: 'Perseus Arm', type: 'Major Spiral Arm', distanceLy: 32000 },
      { id: 'bulge', name: 'Galactic Bulge & Bar', type: 'Dense Stellar Core', distanceLy: 0 }
    ];

    if (this.activeCategory === 'all' || this.activeCategory === 'galaxy') {
      const filteredFeatures = galaxyFeatures.filter((f) => !q || f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q));
      if (filteredFeatures.length > 0) {
        const header = document.createElement('div');
        header.className = 'tree-group-header';
        header.textContent = 'GALACTIC STRUCTURES';
        tree.appendChild(header);

        filteredFeatures.forEach((feat) => {
          const item = document.createElement('button');
          item.className = 'tree-item feature-item';
          item.innerHTML = `
            <span class="tree-dot" style="background:#ffaa33"></span>
            <span class="tree-name">${feat.name}</span>
            <span class="tree-dist">${feat.distanceLy ? feat.distanceLy.toLocaleString() + ' ly' : 'GC (l=0, b=0)'}</span>
          `;
          item.addEventListener('click', () => {
            if (feat.isGC) this.scene.flyToSgrA();
            else if (feat.isSol) this.scene.flyToSol();
            else this.scene.flyToGalaxy();
            this.openInspector(feat);
          });
          tree.appendChild(item);
        });
      }
    }

    // 2. Star Systems
    if (this.activeCategory === 'all' || this.activeCategory === 'stars') {
      const filteredStars = systems.filter((s) => !q || s.name.toLowerCase().includes(q) || s.spectralType.toLowerCase().includes(q));
      if (filteredStars.length > 0) {
        const header = document.createElement('div');
        header.className = 'tree-group-header';
        header.textContent = 'HOST STAR SYSTEMS';
        tree.appendChild(header);

        filteredStars.forEach((star) => {
          const item = document.createElement('button');
          item.className = 'tree-item star-item';
          item.innerHTML = `
            <span class="tree-dot" style="background:${star.color || '#ffddaa'}"></span>
            <span class="tree-name">${star.name} (${star.spectralType})</span>
            <span class="tree-dist">${star.distanceLy ? star.distanceLy.toFixed(1) + ' ly' : '0 ly'}</span>
          `;
          item.addEventListener('click', () => {
            this.scene.systemRenderer.loadSystem(star.id);
            if (star.id === 'sol') this.scene.flyToSol();
            else this.scene.flyToObject(star);
            this.openInspector(star);
          });
          tree.appendChild(item);
        });
      }
    }

    // 3. Exoplanets
    if (this.activeCategory === 'all' || this.activeCategory === 'exoplanets') {
      const filteredPlanets = exoplanets.filter((p) => !q || p.name.toLowerCase().includes(q) || p.hostStar.toLowerCase().includes(q));
      if (filteredPlanets.length > 0) {
        const header = document.createElement('div');
        header.className = 'tree-group-header';
        header.textContent = `EXOPLANETS (${filteredPlanets.length})`;
        tree.appendChild(header);

        filteredPlanets.forEach((p) => {
          const item = document.createElement('button');
          const isHab = p.habitabilityStatus === 'habitable';
          item.className = 'tree-item planet-item' + (isHab ? ' habitable' : '');
          item.setAttribute('aria-label', `Select ${p.name}`);
          item.innerHTML = `
            <span class="tree-dot" style="background:${isHab ? '#10b981' : '#38bdf8'}"></span>
            <span class="tree-name">${p.name}</span>
            <span class="tree-dist">${p.distanceLy ? p.distanceLy.toFixed(1) + ' ly' : '—'}</span>
          `;
          item.addEventListener('click', () => {
            this.scene.flyToObject(p);
            this.openInspector(p);
          });
          tree.appendChild(item);
        });
      }
    }
  }

  // -----------------------------------------------------------
  // Right Panel: Inspector Dossier
  // -----------------------------------------------------------
  _initInspector() {
    const closeBtn = document.getElementById('inspector-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeInspector());
    }

    const btnTransit = document.getElementById('btn-jump-transit');
    if (btnTransit) {
      btnTransit.addEventListener('click', () => {
        document.getElementById('transit-lab')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const btnCompare = document.getElementById('btn-jump-compare');
    if (btnCompare) {
      btnCompare.addEventListener('click', () => {
        document.getElementById('scale-studio')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  openInspector(item) {
    const panel = document.getElementById('hud-inspector');
    if (!panel) return;

    // Accessibility live region announcement
    const liveAnnouncer = document.getElementById('mc-aria-live');
    if (liveAnnouncer) {
      liveAnnouncer.textContent = `Selected ${item.name}. Detailed dossier loaded.`;
    }

    document.getElementById('insp-name').textContent = item.name;
    document.getElementById('insp-host').textContent = item.hostStar || item.spectralType || item.type || 'Milky Way Core';
    document.getElementById('insp-dist').textContent = item.distanceLy ? `${item.distanceLy.toLocaleString()} ly (${(item.distanceLy / 3.26156).toFixed(1)} pc)` : 'Galactic Centre';
    document.getElementById('insp-mass').textContent = item.massEarth ? `${item.massEarth} M⊕` : (item.massSolar ? `${item.massSolar} M☉` : '—');
    document.getElementById('insp-rad').textContent  = item.radiusEarth ? `${item.radiusEarth} R⊕` : (item.radiusSolar ? `${item.radiusSolar} R☉` : '—');
    document.getElementById('insp-period').textContent = item.orbitalPeriodDays ? `${item.orbitalPeriodDays} Earth Days` : (item.periodDays ? `${item.periodDays} d` : '—');
    document.getElementById('insp-temp').textContent = item.surfaceTempK ? `${item.surfaceTempK} K (${(item.surfaceTempK - 273.15).toFixed(1)} °C)` : (item.equilibriumTempK ? `${item.equilibriumTempK} K` : '—');
    document.getElementById('insp-method').textContent = item.discoveryMethod || 'Direct Astrometry / EHT';
    document.getElementById('insp-year').textContent = item.discoveryYear || '2022';

    const hzEl = document.getElementById('insp-hz');
    if (hzEl) {
      const isHab = item.habitabilityStatus === 'habitable' || item.habitability === 'Conservative Habitable Zone';
      hzEl.textContent = isHab ? 'CONSERVATIVE HABITABLE ZONE' : (item.habitability || 'NON-HABITABLE ENVIRONMENT');
      hzEl.style.color = isHab ? '#10b981' : '#ff5544';
    }

    const summaryEl = document.getElementById('insp-summary');
    if (summaryEl) {
      summaryEl.textContent = item.summary || item.type || 'Astrophysical deep field object catalogue data.';
    }

    // Provenance badge
    const provEl = document.getElementById('insp-provenance');
    if (provEl) {
      provEl.textContent = 'SOURCE: NASA EXOPLANET ARCHIVE · GAIA DR3';
    }

    panel.classList.add('open');
    panel.removeAttribute('hidden');
  }

  closeInspector() {
    const panel = document.getElementById('hud-inspector');
    if (panel) {
      panel.classList.remove('open');
      panel.setAttribute('hidden', '');
    }
  }

  // -----------------------------------------------------------
  // Bottom Bar: Telemetry Readouts
  // -----------------------------------------------------------
  _initBottomTelemetry() {
    const coordsEl = document.getElementById('mc-telemetry-coords');
    const distSolEl = document.getElementById('mc-telemetry-dsol');
    const posXYZEl = document.getElementById('mc-telemetry-xyz');

    this.scene.canvas.addEventListener('cameramove', (e) => {
      const { cameraPos, target } = e.detail;
      if (coordsEl) {
        // Approximate galactic longitude based on camera azimuth
        const azimuth = Math.atan2(cameraPos.z, cameraPos.x) * (180 / Math.PI);
        const elevation = Math.atan2(cameraPos.y, Math.sqrt(cameraPos.x * cameraPos.x + cameraPos.z * cameraPos.z)) * (180 / Math.PI);
        coordsEl.textContent = formatGalacticCoords(azimuth, elevation);
      }

      if (distSolEl) {
        // Distance from Sol (Sun is at SUN_GC_LY, 0, 0)
        const dSol = cameraPos.distanceTo(new THREE.Vector3(26673, 0, 0));
        distSolEl.textContent = `D☉: ${Math.round(dSol).toLocaleString()} ly`;
      }

      if (posXYZEl) {
        posXYZEl.textContent = `XYZ: [${Math.round(cameraPos.x)}, ${Math.round(cameraPos.y)}, ${Math.round(cameraPos.z)}] ly`;
      }
    });
  }

  // -----------------------------------------------------------
  // Simulation Time Engine Controls
  // -----------------------------------------------------------
  _initTimeEngine() {
    const timeBtns = document.querySelectorAll('.mc-time-btn');
    const scrubber = document.getElementById('mc-time-scrubber');
    const dateDisplay = document.getElementById('mc-sim-date');

    timeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        timeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const scale = parseFloat(btn.dataset.speed);
        this.scene.setTimeScale(scale);
      });
    });

    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        this.scene.simDaysElapsed = parseFloat(e.target.value);
      });
    }

    // Update simulated calendar date display
    setInterval(() => {
      if (dateDisplay && this.scene) {
        const d = new Date(this.scene.startDate.getTime() + this.scene.simDaysElapsed * 86400000);
        dateDisplay.textContent = `SIM: ${d.toISOString().slice(0, 10)}`;
        if (scrubber && !document.activeElement?.isSameNode(scrubber)) {
          scrubber.value = (this.scene.simDaysElapsed % 3650).toFixed(0);
        }
      }
    }, 100);
  }

  // -----------------------------------------------------------
  // Layer Toggles
  // -----------------------------------------------------------
  _initLayerToggles() {
    document.querySelectorAll('.mc-layer-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const active = btn.classList.toggle('active');
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        const layer = btn.dataset.layer;

        if (layer === 'galaxy') {
          this.scene.galaxyRenderer.setVisible(active);
        } else if (layer === 'exoplanets') {
          this.scene.exoMarkers.forEach((m) => { m.visible = active; });
        } else if (layer === 'orbits') {
          this.scene.systemRenderer.setOrbitsVisible(active);
        } else if (layer === 'hz') {
          this.scene.systemRenderer.setHabitableZoneVisible(active);
        } else if (layer === 'stars') {
          this.scene.starfield.setVisible(active);
        }
      });
    });

    const btnGalaxyView = document.getElementById('btn-recenter-galaxy');
    if (btnGalaxyView) {
      btnGalaxyView.addEventListener('click', () => this.scene.flyToGalaxy());
    }

    const btnSolView = document.getElementById('btn-recenter-sol');
    if (btnSolView) {
      btnSolView.addEventListener('click', () => this.scene.flyToSol());
    }
  }

  // -----------------------------------------------------------
  // 2D Galactic Radar Minimap
  // -----------------------------------------------------------
  _initMinimap() {
    const canvas = document.getElementById('hud-minimap');
    if (!canvas) return;
    this.minimap = canvas;
    setInterval(() => this._drawMinimap(), 80);
  }

  _drawMinimap() {
    const c = this.minimap;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    // Dark grid background
    ctx.fillStyle = 'rgba(2, 6, 18, 0.9)';
    ctx.fillRect(0, 0, c.width, c.height);

    // Galactic ring boundary
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, c.width * 0.44, 0, Math.PI * 2);
    ctx.stroke();

    // Sgr A* Core dot
    ctx.fillStyle = '#ffaa33';
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    const GALAXY_R = 52000;
    const scale = (c.width * 0.44) / GALAXY_R;

    // Exoplanet marker points
    this.scene.exoMarkers.forEach((m) => {
      const px = c.width / 2 + m.position.x * scale;
      const py = c.height / 2 - m.position.z * scale;
      ctx.fillStyle = m.userData.habitabilityStatus === 'habitable' ? '#10b981' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sol dot ("YOU ARE HERE")
    const sx = c.width / 2 + 26673 * scale;
    const sy = c.height / 2;
    ctx.fillStyle = '#ffff55';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Camera position & frustum direction
    const cam = this.scene.camera;
    const cx = c.width / 2 + cam.position.x * scale;
    const cy = c.height / 2 - cam.position.z * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Frustum cone line towards target
    const tx = c.width / 2 + this.scene.camCtrl.target.x * scale;
    const ty = c.height / 2 - this.scene.camCtrl.target.z * scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  // -----------------------------------------------------------
  // Mobile Drawer Navigation (< 900px)
  // -----------------------------------------------------------
  _initMobileDrawers() {
    const drawerTabs = document.querySelectorAll('.mc-drawer-tab');
    drawerTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetDrawerId = tab.dataset.target;
        const panel = document.getElementById(targetDrawerId);
        if (panel) {
          const isOpen = panel.classList.contains('mobile-open');
          document.querySelectorAll('.mc-panel').forEach((p) => p.classList.remove('mobile-open'));
          drawerTabs.forEach((t) => t.classList.remove('active'));
          if (!isOpen) {
            panel.classList.add('mobile-open');
            tab.classList.add('active');
          }
        }
      });
    });
  }

  _initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'r' || e.key === 'R') {
        this.scene.flyToGalaxy();
      }
    });
  }
}
