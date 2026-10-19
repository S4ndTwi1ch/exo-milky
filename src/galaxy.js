/**
 * INTERACTIVE 3D SPIRAL GALAXY SIMULATOR
 * Kinematic simulation of logarithmic spiral arms, central bulge, Sgr A* and stellar populations
 */

export class GalaxySimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.numParticles = 3800;

    // Camera & Transformation state
    this.pitch = 0.95; // Tilt angle in radians (viewing from an elevated perspective)
    this.yaw = 0.0;    // Rotation angle
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.autoRotateSpeed = 0.0018;

    // Interactivity
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseX = 0;
    this.mouseY = 0;

    // Feature toggles
    this.showArmLabels = true;
    this.showSolarMarker = true;
    this.reducedMotion = false;

    // Galaxy astrophysical configuration
    this.galaxyRadius = 380;
    this.sunDistance = 380 * (26670 / 52850); // Normalized Solar distance (~191px)
    this.sunAngle = 1.35; // Position along Orion spur

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.setupInputs();
    this.generateParticles();
    this.animate();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.cx = this.width / 2;
    this.cy = this.height / 2;
  }

  generateParticles() {
    this.particles = [];

    // 1. Central Galactic Bulge & Sgr A* Core (High density, spherical / triaxial bar)
    const coreCount = Math.floor(this.numParticles * 0.28);
    for (let i = 0; i < coreCount; i++) {
      const dist = Math.pow(Math.random(), 2.2) * 85;
      const theta = Math.random() * Math.PI * 2;
      const zSpread = (1 - dist / 85) * (Math.random() - 0.5) * 45;

      // Core stars are predominantly older K/M giants and warm G dwarfs
      const colorType = Math.random();
      let color = "rgba(255, 238, 205, ";
      if (colorType < 0.45) color = "rgba(245, 185, 95, "; // Amber K-giant
      else if (colorType < 0.75) color = "rgba(255, 255, 240, "; // White-yellow core star
      else color = "rgba(235, 110, 80, "; // Red M-giant

      this.particles.push({
        r: dist,
        theta: theta,
        z: zSpread,
        baseSize: Math.random() * 1.8 + 0.6,
        colorPrefix: color,
        alpha: Math.random() * 0.6 + 0.35,
        speed: (0.012 / (Math.sqrt(dist + 15) * 0.12)) * 0.08,
        isCore: true
      });
    }

    // 2. Logarithmic Spiral Arms (Perseus, Scutum-Centaurus, Sagittarius, Norma)
    const armCount = 4;
    const diskCount = this.numParticles - coreCount;
    const b = 0.26; // Spiral pitch parameter

    for (let i = 0; i < diskCount; i++) {
      const armIndex = i % armCount;
      const armOffset = (armIndex * 2 * Math.PI) / armCount;

      // Distance distribution along the disk
      const normDist = Math.pow(Math.random(), 0.85);
      const r = 70 + normDist * (this.galaxyRadius - 70);

      // Logarithmic spiral angle theta = ln(r/a) / b
      const spiralTheta = Math.log(r / 60) / b + armOffset;

      // Gaussian dispersion perpendicular to the arm
      const dispersion = (Math.random() - 0.5) * 0.45 * (r / 180);
      const theta = spiralTheta + dispersion;

      // Thin disk vertical scale height: z decreases with radius
      const z = (Math.random() - 0.5) * 22 * (1 - r / (this.galaxyRadius * 1.2));

      // Stellar spectral class distribution
      const specRoll = Math.random();
      let colorPrefix = "rgba(210, 230, 255, "; // Hot O/B blue-white
      let baseSize = Math.random() * 1.4 + 0.5;

      if (specRoll < 0.25) {
        colorPrefix = "rgba(145, 205, 255, "; // Ionized hydrogen O-star
        baseSize += 0.5;
      } else if (specRoll < 0.60) {
        colorPrefix = "rgba(240, 245, 255, "; // Main sequence A/F star
      } else if (specRoll < 0.85) {
        colorPrefix = "rgba(255, 225, 140, "; // Solar-like G dwarf
      } else {
        colorPrefix = "rgba(225, 120, 110, "; // Interstellar nebular dust knot
        baseSize *= 1.3;
      }

      // Keplerian-like rotation curve with dark matter flat rotation speed
      const orbitalSpeed = (0.0035 / (1 + r * 0.002)) * (0.85 + Math.random() * 0.3);

      this.particles.push({
        r: r,
        theta: theta,
        z: z,
        baseSize: baseSize,
        colorPrefix: colorPrefix,
        alpha: Math.random() * 0.55 + 0.25,
        speed: orbitalSpeed,
        isCore: false
      });
    }
  }

  setupInputs() {
    // Mouse drag rotation
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.yaw += dx * 0.006;
        this.pitch = Math.max(0.15, Math.min(1.45, this.pitch + dy * 0.006));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
      this.mouseX = (e.clientX / this.width - 0.5) * 2;
      this.mouseY = (e.clientY / this.height - 0.5) * 2;
    });

    // Touch support for mobile devices
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener("touchend", () => {
      this.isDragging = false;
    });

    window.addEventListener("touchmove", (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.yaw += dx * 0.006;
        this.pitch = Math.max(0.15, Math.min(1.45, this.pitch + dy * 0.006));
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    // Wheel zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.001;
      this.targetZoom = Math.max(0.6, Math.min(2.4, this.targetZoom + zoomDelta));
      const zoomSlider = document.getElementById("galaxy-zoom");
      if (zoomSlider) zoomSlider.value = this.targetZoom;
    }, { passive: false });
  }

  project(r, theta, z) {
    // Current transformed angle
    const effTheta = theta + this.yaw;

    // Disk plane coordinates
    const xDisk = r * Math.cos(effTheta);
    const yDisk = r * Math.sin(effTheta);

    // Apply pitch tilt (rotation around X axis)
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);

    const x3d = xDisk;
    const y3d = yDisk * cosP - z * sinP;
    const z3d = yDisk * sinP + z * cosP;

    // Perspective projection with zoom
    const fov = 900;
    const scale = (fov / (fov + z3d)) * this.zoom;

    return {
      x: this.cx + x3d * scale,
      y: this.cy + y3d * scale,
      scale: scale,
      depth: z3d
    };
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Smooth zoom interpolation
    this.zoom += (this.targetZoom - this.zoom) * 0.1;

    // Automatic rotation when not actively dragging
    if (!this.reducedMotion) {
      if (!this.isDragging) {
        this.yaw += this.autoRotateSpeed;
      }
    }

    // 1. Draw Sagittarius A* Central Accretion Disc & Lensing Halo
    const coreCenter = this.project(0, 0, 0);
    const coreGrad = this.ctx.createRadialGradient(
      coreCenter.x, coreCenter.y, 1,
      coreCenter.x, coreCenter.y, 95 * coreCenter.scale * this.zoom
    );
    coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    coreGrad.addColorStop(0.12, "rgba(255, 215, 120, 0.75)");
    coreGrad.addColorStop(0.35, "rgba(229, 169, 60, 0.35)");
    coreGrad.addColorStop(0.7, "rgba(56, 182, 186, 0.12)");
    coreGrad.addColorStop(1, "rgba(5, 7, 11, 0)");

    this.ctx.fillStyle = coreGrad;
    this.ctx.beginPath();
    this.ctx.arc(coreCenter.x, coreCenter.y, 95 * coreCenter.scale * this.zoom, 0, Math.PI * 2);
    this.ctx.fill();

    // Event Horizon Black Dot (Schwarzschild shadow representation)
    this.ctx.fillStyle = "#030407";
    this.ctx.beginPath();
    this.ctx.arc(coreCenter.x, coreCenter.y, 3.5 * coreCenter.scale, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Render Stars
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Advance orbital position
      if (!this.reducedMotion) {
        p.theta += p.speed;
      }

      const proj = this.project(p.r, p.theta, p.z);

      // Cull offscreen points
      if (proj.x < -20 || proj.x > this.width + 20 || proj.y < -20 || proj.y > this.height + 20) {
        continue;
      }

      const size = Math.max(0.4, p.baseSize * proj.scale);
      this.ctx.fillStyle = `${p.colorPrefix}${p.alpha})`;

      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 3. Highlight Solar System Position (Orion Spur)
    if (this.showSolarMarker) {
      if (!this.reducedMotion) {
        this.sunAngle += 0.0022; // Sun rotates along with disk
      }
      const sunProj = this.project(this.sunDistance, this.sunAngle, 4);

      // Outer targeting reticle
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(229, 169, 60, 0.8)";
      this.ctx.lineWidth = 1.2;
      this.ctx.setLineDash([3, 3]);
      this.ctx.beginPath();
      this.ctx.arc(sunProj.x, sunProj.y, 14 * sunProj.scale, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Center Solar beacon
      this.ctx.fillStyle = "#E5A93C";
      this.ctx.beginPath();
      this.ctx.arc(sunProj.x, sunProj.y, 3 * sunProj.scale, 0, Math.PI * 2);
      this.ctx.fill();

      // Connecting annotation line and label
      this.ctx.strokeStyle = "rgba(229, 169, 60, 0.4)";
      this.ctx.beginPath();
      this.ctx.moveTo(sunProj.x + 14 * sunProj.scale, sunProj.y);
      this.ctx.lineTo(sunProj.x + 45, sunProj.y - 20);
      this.ctx.lineTo(sunProj.x + 150, sunProj.y - 20);
      this.ctx.stroke();

      this.ctx.fillStyle = "#F5F6FA";
      this.ctx.font = "600 11px 'JetBrains Mono', monospace";
      this.ctx.fillText("SOLAR SYSTEM (ORION SPUR)", sunProj.x + 50, sunProj.y - 26);
      this.ctx.fillStyle = "rgba(229, 169, 60, 0.9)";
      this.ctx.font = "10px 'JetBrains Mono', monospace";
      this.ctx.fillText("DIST TO CORE: 26,670 ly", sunProj.x + 50, sunProj.y - 10);
      this.ctx.restore();
    }

    // 4. Spiral Arm Annotations (Perseus, Scutum-Centaurus, Sgr A*)
    if (this.showArmLabels) {
      this.renderArmLabel("SAGITTARIUS A* (CORE)", 0, 0, 0, "#38B6BA");
      this.renderArmLabel("PERSEUS ARM", 300, 0.8 + this.yaw, 0, "rgba(242, 245, 252, 0.7)");
      this.renderArmLabel("SCUTUM-CENTAURUS ARM", 270, 3.8 + this.yaw, 0, "rgba(242, 245, 252, 0.7)");
      this.renderArmLabel("CARINA-SAGITTARIUS ARM", 210, 2.3 + this.yaw, 0, "rgba(242, 245, 252, 0.7)");
    }
  }

  renderArmLabel(text, r, theta, z, color) {
    const proj = this.project(r, theta, z);
    if (proj.x < 30 || proj.x > this.width - 120 || proj.y < 30 || proj.y > this.height - 30) {
      return;
    }

    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.font = "500 10px 'JetBrains Mono', monospace";
    this.ctx.letterSpacing = "0.08em";

    // Small crosshair indicator
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(proj.x - 4, proj.y);
    this.ctx.lineTo(proj.x + 4, proj.y);
    this.ctx.moveTo(proj.x, proj.y - 4);
    this.ctx.lineTo(proj.x, proj.y + 4);
    this.ctx.stroke();

    this.ctx.fillText(text, proj.x + 8, proj.y + 3);
    this.ctx.restore();
  }

  animate() {
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  recenter() {
    this.pitch = 0.95;
    this.yaw = 0.0;
    this.targetZoom = 1.0;
    const zoomSlider = document.getElementById("galaxy-zoom");
    if (zoomSlider) zoomSlider.value = 1.0;
  }
}
