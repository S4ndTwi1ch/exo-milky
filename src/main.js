/**
 * ATLAS APPLICATION ORCHESTRATOR
 * Coordinates Canvas engines, dynamic filtering, modal dialogues, and telemetry
 */

import anime from "animejs";
import { GalaxySimulation } from "./galaxy.js";
import { TransitLaboratory } from "./transit-lab.js";
import { PlanetRenderer } from "./planet-renderer.js";
import { CosmicAudioEngine } from "./audio.js";
import { EXOPLANETS, GALACTIC_ZONES } from "./exoplanets-data.js";
import { MissionControlScene } from './engine/three-scene.js';
import { HudController } from './hud/hud-controller.js';
document.addEventListener("DOMContentLoaded", () => {

  // 0. Three.js Mission Control 3D Scene
  const mcCanvas = document.getElementById('mc-canvas');
  let missionScene = null;
  if (mcCanvas) {
    missionScene = new MissionControlScene(mcCanvas);
    new HudController(missionScene);
  }

  // 1. Audio Engine
  const audio = new CosmicAudioEngine();
  const soundToggle = document.getElementById("sound-toggle");
  const iconSoundOff = soundToggle?.querySelector(".icon-sound-off");
  const iconSoundOn = soundToggle?.querySelector(".icon-sound-on");

  const soundBtnText = document.getElementById("sound-btn-text");
  const soundEq = document.getElementById("sound-eq");

  if (soundToggle) {
    soundToggle.addEventListener("click", async () => {
      const active = await audio.toggle();
      soundToggle.classList.toggle("active", active);
      soundToggle.setAttribute("aria-pressed", active ? "true" : "false");
      if (iconSoundOff && iconSoundOn) {
        iconSoundOff.classList.toggle("hidden", active);
        iconSoundOn.classList.toggle("hidden", !active);
      }
      if (soundBtnText) {
        soundBtnText.textContent = active ? "MUSIC: ON" : "MUSIC: OFF";
      }
      if (soundEq) {
        soundEq.classList.toggle("hidden", !active);
      }
    });
  }

  // 2. Reduced Motion Accessibility Toggle
  const motionToggle = document.getElementById("motion-toggle");
  let isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updateMotionState(reduced) {
    isReducedMotion = reduced;
    document.body.classList.toggle("reduced-motion", reduced);
    if (motionToggle) {
      motionToggle.classList.toggle("active", reduced);
      motionToggle.setAttribute("aria-pressed", reduced ? "true" : "false");
    }
    if (galaxySim) {
      galaxySim.reducedMotion = reduced;
    }
    if (missionScene) {
      missionScene.setReducedMotion(reduced);
    }
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      updateMotionState(!isReducedMotion);
      audio.playBeep(440, 0.05);
    });
  }

  // 3. Live UTC Telemetry Clock
  const clockElem = document.getElementById("telemetry-clock");
  function updateClock() {
    if (clockElem) {
      const now = new Date();
      clockElem.textContent = `${now.toUTCString().slice(17, 25)} UTC`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 4. Galaxy Canvas Simulation
  const galaxyCanvas = document.getElementById("galaxy-canvas");
  let galaxySim = null;
  if (galaxyCanvas) {
    galaxySim = new GalaxySimulation(galaxyCanvas);

    // Galaxy HUD controls
    const btnRecenter = document.getElementById("btn-recenter");
    const btnArms = document.getElementById("btn-toggle-arms");
    const btnSolar = document.getElementById("btn-toggle-solar");
    const zoomInput = document.getElementById("galaxy-zoom");

    if (btnRecenter) {
      btnRecenter.addEventListener("click", () => {
        galaxySim.recenter();
        audio.playBeep(620, 0.06);
      });
    }

    if (btnArms) {
      btnArms.addEventListener("click", () => {
        galaxySim.showArmLabels = !galaxySim.showArmLabels;
        btnArms.classList.toggle("active", galaxySim.showArmLabels);
        btnArms.setAttribute("aria-pressed", galaxySim.showArmLabels ? "true" : "false");
        audio.playBeep(520, 0.05);
      });
    }

    if (btnSolar) {
      btnSolar.addEventListener("click", () => {
        galaxySim.showSolarMarker = !galaxySim.showSolarMarker;
        btnSolar.classList.toggle("active", galaxySim.showSolarMarker);
        btnSolar.setAttribute("aria-pressed", galaxySim.showSolarMarker ? "true" : "false");
        audio.playBeep(580, 0.05);
      });
    }

    if (zoomInput) {
      zoomInput.addEventListener("input", (e) => {
        galaxySim.targetZoom = parseFloat(e.target.value);
      });
    }
  }

  // 5. Animated Metric Counters using Anime.js
  const metricCards = document.querySelectorAll(".metric-card");
  let countersAnimated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !countersAnimated) {
        countersAnimated = true;
        metricCards.forEach((card) => {
          const numElem = card.querySelector(".metric-number");
          if (!numElem) return;

          const target = parseFloat(numElem.dataset.target);
          const decimals = parseInt(numElem.dataset.decimals || "0", 10);

          const counterObj = { val: 0 };
          anime({
            targets: counterObj,
            val: target,
            round: decimals === 0 ? 1 : 100,
            easing: "easeOutExpo",
            duration: 2200,
            update: () => {
              numElem.textContent = decimals > 0 
                ? counterObj.val.toFixed(decimals) 
                : Math.floor(counterObj.val).toLocaleString();
            }
          });
        });
      }
    });
  }, { threshold: 0.25 });

  const metricsSection = document.getElementById("galactic-metrics");
  if (metricsSection) observer.observe(metricsSection);

  // 6. Galactic Zone Stratification Tabs
  const zoneTabs = document.querySelectorAll(".zone-tab");
  const zoneName = document.getElementById("zone-display-name");
  const zoneDesc = document.getElementById("zone-display-desc");
  const zoneTags = document.getElementById("zone-tags");
  const zoneStatVal = document.getElementById("zone-stat-val");
  const zoneSpecVal = document.getElementById("zone-spec-val");

  zoneTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      zoneTabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      const zoneKey = tab.dataset.zone;
      const data = GALACTIC_ZONES[zoneKey];
      if (data) {
        if (zoneName) zoneName.textContent = data.title;
        if (zoneDesc) zoneDesc.textContent = data.desc;
        if (zoneStatVal) zoneStatVal.textContent = data.density;
        if (zoneSpecVal) zoneSpecVal.textContent = data.dominantClass;

        if (zoneTags) {
          zoneTags.innerHTML = data.tags
            .map((t) => `<span class="spec-tag">${t}</span>`)
            .join("");
        }

        audio.playBeep(480, 0.05);

        // Smooth Anime.js fade transition
        const panel = document.getElementById("panel-zone");
        if (panel) {
          anime({
            targets: panel,
            opacity: [0.65, 1],
            translateY: [6, 0],
            duration: 350,
            easing: "easeOutQuad"
          });
        }
      }
    });
  });

  // 7. Exoplanet Catalogue Rendering & Filtering
  const exoplanetsGrid = document.getElementById("exoplanets-grid");
  const filterType = document.getElementById("filter-type");
  const filterHabitability = document.getElementById("filter-habitability");
  const searchInput = document.getElementById("search-planets");
  const filteredCount = document.getElementById("filtered-count");

  // Modal Dialog & Renderer Setup
  const modal = document.getElementById("planet-modal");
  const modalClose = document.getElementById("modal-close");
  const modalCanvas = document.getElementById("modal-planet-canvas");
  const planetRenderer = modalCanvas ? new PlanetRenderer(modalCanvas) : null;

  function renderExoplanets(planets) {
    if (!exoplanetsGrid) return;
    exoplanetsGrid.innerHTML = "";

    if (filteredCount) {
      filteredCount.textContent = planets.length;
    }

    planets.forEach((planet) => {
      const card = document.createElement("article");
      card.className = "planet-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `View dossier for exoplanet ${planet.name}`);

      // Spherical CSS radial gradient thumbnail
      const colors = planet.colorPalette;
      const thumbStyle = `background: radial-gradient(circle at 30% 30%, ${colors[0]}, ${colors[1]} 65%, ${colors[3]} 100%);`;

      const typeBadgeClass = planet.type === "super-earth" 
        ? "super-earth" 
        : planet.type === "gas-giant" ? "gas-giant" : "";

      card.innerHTML = `
        <div class="card-top">
          <span class="planet-type-badge ${typeBadgeClass}">${planet.typeLabel.toUpperCase()}</span>
          <span class="planet-dist">${planet.distanceLy} ly</span>
        </div>
        <div class="planet-visual-thumb" aria-hidden="true">
          <div class="thumb-sphere" style="${thumbStyle}"></div>
        </div>
        <h3 class="planet-name">${planet.name}</h3>
        <div class="planet-host">${planet.hostStar}</div>
        <div class="planet-specs-mini">
          <div class="mini-spec">
            <span class="mini-spec-label">MASS</span>
            <span class="mini-spec-value">${planet.massEarth} M⊕</span>
          </div>
          <div class="mini-spec">
            <span class="mini-spec-label">RADIUS</span>
            <span class="mini-spec-value">${planet.radiusEarth} R⊕</span>
          </div>
          <div class="mini-spec">
            <span class="mini-spec-label">PERIOD</span>
            <span class="mini-spec-value">${planet.orbitalPeriodDays} d</span>
          </div>
          <div class="mini-spec">
            <span class="mini-spec-label">EQ. TEMP</span>
            <span class="mini-spec-value">${planet.surfaceTempK} K</span>
          </div>
        </div>
        <div class="habitability-indicator">
          <span class="status-dot ${planet.habitability}"></span>
          <span>${planet.habitabilityLabel}</span>
        </div>
      `;

      // Open Modal on click or Enter key
      const openModalHandler = () => {
        openPlanetModal(planet);
        audio.playBeep(720, 0.08);
      };

      card.addEventListener("click", openModalHandler);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModalHandler();
        }
      });

      exoplanetsGrid.appendChild(card);
    });
  }

  function filterPlanets() {
    const typeVal = filterType ? filterType.value : "all";
    const habVal = filterHabitability ? filterHabitability.value : "all";
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = EXOPLANETS.filter((p) => {
      const matchType = typeVal === "all" || p.type === typeVal;
      const matchHab = habVal === "all" || p.habitability === habVal;
      const matchQuery = !query || 
        p.name.toLowerCase().includes(query) || 
        p.hostStar.toLowerCase().includes(query) ||
        p.discoveryMethod.toLowerCase().includes(query);
      return matchType && matchHab && matchQuery;
    });

    renderExoplanets(filtered);
  }

  if (filterType) filterType.addEventListener("change", filterPlanets);
  if (filterHabitability) filterHabitability.addEventListener("change", filterPlanets);
  if (searchInput) searchInput.addEventListener("input", filterPlanets);

  // Initial render
  renderExoplanets(EXOPLANETS);

  // Planet Modal Dialog Functionality
  function openPlanetModal(planet) {
    if (!modal) return;

    document.getElementById("modal-planet-title").textContent = planet.name;
    document.getElementById("modal-description").textContent = planet.summary;
    document.getElementById("modal-star").textContent = planet.hostStar;
    document.getElementById("modal-dist").textContent = `${planet.distanceLy} ly (${planet.distancePc} pc)`;
    document.getElementById("modal-mass").textContent = `${planet.massEarth} M⊕`;
    document.getElementById("modal-radius").textContent = `${planet.radiusEarth} R⊕`;
    document.getElementById("modal-period").textContent = `${planet.orbitalPeriodDays} Earth Days`;
    document.getElementById("modal-temp").textContent = `${planet.surfaceTempK} K (${(planet.surfaceTempK - 273.15).toFixed(1)} °C)`;
    document.getElementById("modal-method").textContent = planet.discoveryMethod;
    document.getElementById("modal-year").textContent = planet.discoveryYear;

    const hzBadge = document.getElementById("modal-hz-badge");
    const hzText = document.getElementById("modal-hz-text");
    if (hzBadge && hzText) {
      hzText.textContent = planet.habitabilityLabel.toUpperCase();
      hzBadge.style.color = planet.habitability === "habitable" ? "var(--accent-emerald)" : "var(--accent-crimson)";
    }

    // Atmosphere bar
    const atmosBar = document.getElementById("modal-atmos-bar");
    const atmosLegend = document.getElementById("modal-atmos-legend");
    if (atmosBar && atmosLegend) {
      atmosBar.innerHTML = "";
      atmosLegend.innerHTML = "";
      planet.atmosphere.forEach((gas) => {
        const seg = document.createElement("div");
        seg.className = "atmos-segment";
        seg.style.width = `${gas.percent}%`;
        seg.style.backgroundColor = gas.color;
        seg.title = `${gas.name}: ${gas.percent}%`;
        atmosBar.appendChild(seg);

        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = `
          <span class="legend-color" style="background-color: ${gas.color};"></span>
          <span>${gas.name} (${gas.percent}%)</span>
        `;
        atmosLegend.appendChild(item);
      });
    }

    // Render Canvas Sphere
    if (planetRenderer) {
      planetRenderer.setPlanet(planet);
      planetRenderer.startAnimation();
    }

    modal.showModal();
  }

  function closePlanetModal() {
    if (!modal) return;
    if (planetRenderer) planetRenderer.stopAnimation();
    modal.close();
  }

  if (modalClose) {
    modalClose.addEventListener("click", closePlanetModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      // Close on backdrop click
      if (e.target === modal) {
        closePlanetModal();
      }
    });
  }

  // 8. Transit Photometry Laboratory Initialization
  const starCanvas = document.getElementById("transit-star-canvas");
  const curveCanvas = document.getElementById("light-curve-canvas");
  if (starCanvas && curveCanvas) {
    new TransitLaboratory(starCanvas, curveCanvas);
  }

  // 9. Scale Studio & Cosmic Comparator
  const compareLeft = document.getElementById("compare-left");
  const compareRight = document.getElementById("compare-right");

  const bodiesData = {
    earth: { name: "Earth", radiusKm: 6371, radiusEarth: 1.0, massKg: 5.97e24, massEarth: 1.0, color: "radial-gradient(circle at 35% 35%, #59a6d8, #18426d 60%, #07192f 100%)" },
    jupiter: { name: "Jupiter", radiusKm: 69911, radiusEarth: 10.97, massKg: 1.898e27, massEarth: 317.8, color: "radial-gradient(circle at 35% 35%, #d9a26f, #94532b 60%, #401f0d 100%)" },
    trappist1e: { name: "TRAPPIST-1e", radiusKm: 5861, radiusEarth: 0.92, massKg: 4.13e24, massEarth: 0.692, color: "radial-gradient(circle at 35% 35%, #7697b0, #365063 60%, #172733 100%)" },
    kepler452b: { name: "Kepler-452b", radiusKm: 10385, radiusEarth: 1.63, massKg: 2.98e25, massEarth: 5.0, color: "radial-gradient(circle at 35% 35%, #588fa8, #2a556b 60%, #0e2430 100%)" },
    wasp12b: { name: "WASP-12b", radiusKm: 132800, radiusEarth: 20.84, massKg: 2.78e27, massEarth: 467.2, color: "radial-gradient(circle at 35% 35%, #e05a47, #5c1818 60%, #1a0808 100%)" },
    cancri55e: { name: "55 Cancri e", radiusKm: 11913, radiusEarth: 1.87, massKg: 4.77e25, massEarth: 7.99, color: "radial-gradient(circle at 35% 35%, #f2a641, #bd4424 60%, #3e0c03 100%)" },
    hd189733b: { name: "HD 189733 b", radiusKm: 80400, radiusEarth: 12.62, massKg: 2.16e27, massEarth: 362.3, color: "radial-gradient(circle at 35% 35%, #377bb5, #164273 60%, #040f1c 100%)" }
  };

  function updateComparator() {
    const aKey = compareLeft ? compareLeft.value : "earth";
    const bKey = compareRight ? compareRight.value : "kepler452b";

    const bodyA = bodiesData[aKey] || bodiesData.earth;
    const bodyB = bodiesData[bKey] || bodiesData.kepler452b;

    // Visual sphere scaling (clamped to fit container cleanly)
    const basePx = 90;
    const ratio = bodyB.radiusEarth / bodyA.radiusEarth;

    let pxA, pxB;
    if (ratio > 1) {
      pxA = Math.max(35, Math.min(100, basePx / Math.sqrt(ratio)));
      pxB = Math.max(60, Math.min(220, pxA * Math.sqrt(ratio * 1.5)));
    } else {
      pxB = Math.max(35, Math.min(100, basePx / Math.sqrt(1 / ratio)));
      pxA = Math.max(60, Math.min(220, pxB * Math.sqrt((1 / ratio) * 1.5)));
    }

    const sphereA = document.getElementById("sphere-a");
    const sphereB = document.getElementById("sphere-b");

    if (sphereA) {
      sphereA.style.width = `${pxA}px`;
      sphereA.style.height = `${pxA}px`;
      sphereA.style.background = bodyA.color;
    }
    if (sphereB) {
      sphereB.style.width = `${pxB}px`;
      sphereB.style.height = `${pxB}px`;
      sphereB.style.background = bodyB.color;
    }

    document.getElementById("name-a").textContent = bodyA.name;
    document.getElementById("meta-a").textContent = `Radius: ${bodyA.radiusKm.toLocaleString()} km (${bodyA.radiusEarth} R⊕)`;

    document.getElementById("name-b").textContent = bodyB.name;
    document.getElementById("meta-b").textContent = `Radius: ${bodyB.radiusKm.toLocaleString()} km (${bodyB.radiusEarth} R⊕)`;

    // Update table
    document.getElementById("col-title-a").textContent = bodyA.name.toUpperCase();
    document.getElementById("col-title-b").textContent = bodyB.name.toUpperCase();

    document.getElementById("rad-val-a").textContent = `${bodyA.radiusKm.toLocaleString()} km`;
    document.getElementById("rad-val-b").textContent = `${bodyB.radiusKm.toLocaleString()} km`;
    document.getElementById("rad-ratio").textContent = `${(bodyB.radiusEarth / bodyA.radiusEarth).toFixed(2)}x`;

    document.getElementById("mass-val-a").textContent = `${bodyA.massEarth.toFixed(2)} M⊕`;
    document.getElementById("mass-val-b").textContent = `${bodyB.massEarth.toFixed(2)} M⊕`;
    document.getElementById("mass-ratio").textContent = `${(bodyB.massEarth / bodyA.massEarth).toFixed(2)}x`;

    const gA = bodyA.massEarth / Math.pow(bodyA.radiusEarth, 2);
    const gB = bodyB.massEarth / Math.pow(bodyB.radiusEarth, 2);
    document.getElementById("grav-val-a").textContent = `${(gA * 9.81).toFixed(2)} m/s² (${gA.toFixed(2)} g)`;
    document.getElementById("grav-val-b").textContent = `${(gB * 9.81).toFixed(2)} m/s² (${gB.toFixed(2)} g)`;
    document.getElementById("grav-ratio").textContent = `${(gB / gA).toFixed(2)}x`;
  }

  if (compareLeft) compareLeft.addEventListener("change", updateComparator);
  if (compareRight) compareRight.addEventListener("change", updateComparator);
  updateComparator();
});
