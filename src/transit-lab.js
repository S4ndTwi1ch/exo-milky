/**
 * TRANSIT PHOTOMETRY & LIGHT CURVE LABORATORY
 * Simulates Kepler/TESS planetary transits across a limb-darkened stellar disk
 */

export class TransitLaboratory {
  constructor(starCanvas, curveCanvas) {
    this.starCanvas = starCanvas;
    this.curveCanvas = curveCanvas;
    this.starCtx = starCanvas.getContext("2d");
    this.curveCtx = curveCanvas.getContext("2d");

    // Physical Parameters
    this.planetRadiusRatio = 1.0; // In Jupiter radii normalized
    this.orbitSpeed = 1.0;
    this.starType = "sun"; // "sun", "m-dwarf", "a-star"

    // Simulation State
    this.phase = 0.0; // 0.0 to 1.0 along the transit swath
    this.history = []; // Recorded flux points for graphing
    this.maxHistory = 160;

    // Molecular feedback descriptions
    this.spectroscopyData = {
      h2o: "Absorption bands at 1.4 µm and 1.9 µm indicate vaporized water in a temperate atmosphere or sub-Neptune envelope.",
      ch4: "Methane absorption at 2.3 µm and 3.3 µm suggests non-equilibrium atmospheric chemistry or biological methanogenesis candidate.",
      co2: "Strong CO₂ feature detected at 4.3 µm (JWST NIRSpec benchmark), diagnosing an oxidized heavy atmosphere on a rocky or magma world."
    };

    this.init();
  }

  init() {
    this.bindControls();
    this.animate();
  }

  bindControls() {
    const radiusSlider = document.getElementById("param-planet-radius");
    const speedSlider = document.getElementById("param-orbit-speed");
    const starSelect = document.getElementById("param-star-type");

    if (radiusSlider) {
      radiusSlider.addEventListener("input", (e) => {
        this.planetRadiusRatio = parseFloat(e.target.value);
        const disp = document.getElementById("disp-planet-radius");
        if (disp) disp.textContent = `${this.planetRadiusRatio.toFixed(1)} R_Jup`;
      });
    }

    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        this.orbitSpeed = parseFloat(e.target.value);
        const disp = document.getElementById("disp-orbit-speed");
        if (disp) disp.textContent = `${this.orbitSpeed.toFixed(1)}x`;
      });
    }

    if (starSelect) {
      starSelect.addEventListener("change", (e) => {
        this.starType = e.target.value;
        this.history = []; // Reset curve for clean display
      });
    }

    // Molecular spectroscopy pills
    const pills = document.querySelectorAll(".mol-pill");
    const feedback = document.getElementById("mol-feedback");
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        pills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        const mol = pill.dataset.mol;
        if (feedback && this.spectroscopyData[mol]) {
          feedback.textContent = this.spectroscopyData[mol];
        }
      });
    });
  }

  getStarConfig() {
    switch (this.starType) {
      case "m-dwarf":
        return {
          radius: 55,
          colorCenter: "#ff8c5a",
          colorLimb: "#8f220d",
          coronaColor: "rgba(255, 75, 40, 0.25)",
          name: "M-Dwarf (0.20 R☉)"
        };
      case "a-star":
        return {
          radius: 110,
          colorCenter: "#ffffff",
          colorLimb: "#80b2ff",
          coronaColor: "rgba(140, 190, 255, 0.25)",
          name: "A-Type White Star (1.7 R☉)"
        };
      case "sun":
      default:
        return {
          radius: 82,
          colorCenter: "#fff6db",
          colorLimb: "#e59323",
          coronaColor: "rgba(255, 185, 55, 0.25)",
          name: "G-Type Solar Analog (1.0 R☉)"
        };
    }
  }

  renderStarViewport() {
    const w = this.starCanvas.width;
    const h = this.starCanvas.height;
    const ctx = this.starCtx;

    ctx.clearRect(0, 0, w, h);

    const star = this.getStarConfig();
    const starX = w / 2;
    const starY = h / 2;

    // 1. Stellar Corona Glow
    const coronaGrad = ctx.createRadialGradient(starX, starY, star.radius * 0.8, starX, starY, star.radius * 1.8);
    coronaGrad.addColorStop(0, star.coronaColor);
    coronaGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(starX, starY, star.radius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 2. Limb-Darkened Stellar Disk
    const starGrad = ctx.createRadialGradient(
      starX - star.radius * 0.15, starY - star.radius * 0.15, star.radius * 0.1,
      starX, starY, star.radius
    );
    starGrad.addColorStop(0, star.colorCenter);
    starGrad.addColorStop(0.7, star.colorLimb);
    starGrad.addColorStop(1, "#360803");

    ctx.fillStyle = starGrad;
    ctx.beginPath();
    ctx.arc(starX, starY, star.radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Stellar Photosphere Granulation / Solar Flares
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(starX, starY, star.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Calculate Planet Transit Position
    // The planet crosses from left (-1.4) to right (+1.4)
    const swathX = (this.phase - 0.5) * (w + 120);
    const planetX = starX + swathX;
    const planetY = starY + 8; // Slight impact parameter b ≈ 0.1

    // Scale planet radius according to star scale and slider
    const planetPixelRadius = Math.max(6, (star.radius * 0.19) * this.planetRadiusRatio);

    // Check overlap with stellar disk
    const distFromCenter = Math.hypot(planetX - starX, planetY - starY);
    let obscurationFraction = 0.0;

    if (distFromCenter < star.radius + planetPixelRadius) {
      // In transit
      const planetArea = Math.PI * Math.pow(planetPixelRadius, 2);
      const starArea = Math.PI * Math.pow(star.radius, 2);
      const maxDip = planetArea / starArea;

      // Ingress / egress smoothing
      if (distFromCenter > star.radius - planetPixelRadius) {
        const overlap = (star.radius + planetPixelRadius - distFromCenter) / (2 * planetPixelRadius);
        obscurationFraction = maxDip * Math.min(1.0, Math.max(0.0, overlap));
      } else {
        obscurationFraction = maxDip;
      }
    }

    // Draw Exoplanet silhouette
    ctx.save();
    ctx.fillStyle = "#030406";
    ctx.beginPath();
    ctx.arc(planetX, planetY, planetPixelRadius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle atmospheric ring around exoplanet
    ctx.strokeStyle = "rgba(56, 182, 186, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Update status indicators
    const phaseIndicator = document.getElementById("transit-phase-indicator");
    if (phaseIndicator) {
      if (distFromCenter < star.radius - planetPixelRadius) {
        phaseIndicator.textContent = "FULL TRANSIT";
        phaseIndicator.style.color = "#E5A93C";
      } else if (distFromCenter < star.radius + planetPixelRadius) {
        phaseIndicator.textContent = planetX < starX ? "INGRESS" : "EGRESS";
        phaseIndicator.style.color = "#38B6BA";
      } else {
        phaseIndicator.textContent = "OUT OF TRANSIT";
        phaseIndicator.style.color = "#9EA8BF";
      }
    }

    // Relative Flux = 1.0 - obscuration + small simulated instrumental photon noise
    const photonNoise = (Math.random() - 0.5) * 0.0008;
    const currentFlux = 1.0 - obscurationFraction + photonNoise;

    // Record for light curve plotting
    this.history.push(currentFlux);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Update depth readout
    const depthPctElem = document.getElementById("val-depth-pct");
    if (depthPctElem) {
      const depthPct = (obscurationFraction * 100).toFixed(2);
      depthPctElem.textContent = `${depthPct}%`;
    }
  }

  renderLightCurve() {
    const w = this.curveCanvas.width;
    const h = this.curveCanvas.height;
    const ctx = this.curveCtx;

    ctx.clearRect(0, 0, w, h);

    // Padding & Layout
    const padLeft = 55;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 35;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid Lines & Axis
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    // Baseline 1.00 Flux line
    const yBaseline = padTop + 20;
    ctx.beginPath();
    ctx.moveTo(padLeft, yBaseline);
    ctx.lineTo(w - padRight, yBaseline);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#5E6982";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("1.000", 12, yBaseline + 3);
    ctx.fillText("0.985", 12, yBaseline + plotH * 0.5);
    ctx.fillText("0.970", 12, padTop + plotH);

    ctx.fillText("TRANSIT DURATION (HOURS)", w / 2 - 60, h - 10);

    // Plot recorded photometric points
    if (this.history.length < 2) return;

    ctx.strokeStyle = "#38B6BA";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const minFlux = 0.965;
    const maxFlux = 1.005;

    for (let i = 0; i < this.history.length; i++) {
      const f = this.history[i];
      const x = padLeft + (i / (this.maxHistory - 1)) * plotW;
      const normalizedY = (f - minFlux) / (maxFlux - minFlux);
      const y = padTop + plotH - normalizedY * plotH;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Latest photometer point dot
    const lastX = padLeft + ((this.history.length - 1) / (this.maxHistory - 1)) * plotW;
    const lastNormY = (this.history[this.history.length - 1] - minFlux) / (maxFlux - minFlux);
    const lastY = padTop + plotH - lastNormY * plotH;

    ctx.fillStyle = "#E5A93C";
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  animate() {
    // Advance orbit phase
    this.phase += 0.0045 * this.orbitSpeed;
    if (this.phase > 1.3) {
      this.phase = -0.3; // Loop back for periodic transit
    }

    this.renderStarViewport();
    this.renderLightCurve();

    requestAnimationFrame(() => this.animate());
  }
}
