/**
 * PROCEDURAL EXOPLANET SPHERE RENDERER
 * Renders atmospheric limb darkening, specular terminator, and surface features on HTML5 Canvas
 */

export class PlanetRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.currentPlanet = null;
    this.rotationAngle = 0;
    this.animId = null;
  }

  setPlanet(planet) {
    this.currentPlanet = planet;
    this.rotationAngle = 0;
  }

  startAnimation() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.rotationAngle += 0.008;
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopAnimation() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  render() {
    if (!this.currentPlanet) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.42;

    ctx.clearRect(0, 0, w, h);

    // 1. Atmospheric Outer Scattering Glow
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.25);
    glowGrad.addColorStop(0, "rgba(56, 182, 186, 0.45)");
    glowGrad.addColorStop(1, "rgba(5, 7, 11, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Spherical Surface
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Surface coloring based on planet type
    const colors = this.currentPlanet.colorPalette || ["#4a6b82", "#2e485e", "#7b9bb0", "#182c3c"];
    const baseGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    baseGrad.addColorStop(0, colors[0]);
    baseGrad.addColorStop(0.5, colors[1]);
    baseGrad.addColorStop(1, colors[2]);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // 3. Procedural Surface Features & Atmospheric Bands
    if (this.currentPlanet.type === "gas-giant") {
      // Horizontal zonal wind bands (Jovian stripes)
      for (let y = -r; y <= r; y += 8) {
        const bandAlpha = Math.sin((y + this.rotationAngle * 15) * 0.12) * 0.25 + 0.3;
        ctx.fillStyle = `rgba(0, 0, 0, ${bandAlpha})`;
        ctx.fillRect(cx - r, cy + y, r * 2, 6);
      }
    } else if (this.currentPlanet.type === "super-earth" && this.currentPlanet.id === "cancri55e") {
      // Magma cracks and glowing fissures
      ctx.strokeStyle = "rgba(255, 170, 50, 0.65)";
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const off = ((i * 35 + this.rotationAngle * 25) % (r * 2)) - r;
        ctx.beginPath();
        ctx.moveTo(cx + off, cy - r * 0.7);
        ctx.bezierCurveTo(cx + off + 15, cy, cx + off - 15, cy + 20, cx + off, cy + r * 0.7);
        ctx.stroke();
      }
    } else {
      // Continents / Rocky Formations
      ctx.fillStyle = colors[2];
      for (let i = 0; i < 5; i++) {
        const continentX = cx + Math.cos(this.rotationAngle + i * 1.3) * (r * 0.55);
        const continentY = cy + Math.sin(i * 1.8) * (r * 0.45);
        ctx.beginPath();
        ctx.ellipse(continentX, continentY, r * 0.28, r * 0.18, i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Day / Night Terminator & Shading
    // Light source coming from top-left (stellar illumination)
    const shadowGrad = ctx.createRadialGradient(
      cx - r * 0.35, cy - r * 0.35, r * 0.2,
      cx + r * 0.3, cy + r * 0.3, r * 1.15
    );
    shadowGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    shadowGrad.addColorStop(0.55, "rgba(0, 0, 0, 0.2)");
    shadowGrad.addColorStop(0.85, "rgba(0, 0, 0, 0.88)");
    shadowGrad.addColorStop(1, "rgba(2, 3, 5, 0.98)");

    ctx.fillStyle = shadowGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore();

    // 5. Rim Atmospheric Edge Light (Limb Darkening)
    ctx.strokeStyle = "rgba(180, 230, 245, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}
