/**
 * GODS-EYE CAMERA CONTROLLER - HIGH PERFORMANCE DAMPED KINEMATICS
 * Features:
 * - Damped logarithmic zoom eliminating stepping/choppiness
 * - Spherical orbital damping for silky-smooth rotation and panning
 * - Arc-curved, eased fly-to interpolation with Perlin quintic smoothing
 * - Keyboard navigation (WASD, Arrows, +/-, Esc)
 */
import * as THREE from 'three';

export const SCALE = {
  GALAXY: 0,
  LOCAL: 1,
  SYSTEM: 2
};

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.scaleLevel = SCALE.GALAXY;

    // Logarithmic zoom bounds
    this.logZoom       = 0;      // Current smoothly interpolated zoom
    this.targetLogZoom = 0;      // Goal zoom from user scroll
    this.minLog        = -0.4;   // Galaxy wide overview (~120,000 ly)
    this.maxLog        = 5.2;    // High-resolution system close-up

    // Spherical orbit angles
    this.azimuth       = 0.45;
    this.targetAzimuth = 0.45;
    this.altitude       = Math.PI / 3.4; // ~53 deg inclination
    this.targetAltitude = Math.PI / 3.4;

    // Camera target (lookAt point)
    this.target     = new THREE.Vector3(0, 0, 0);
    this.targetGoal = new THREE.Vector3(0, 0, 0);

    // Current camera distance
    this.radius = 95000;

    // Fly-to state
    this.flyActive     = false;
    this.flyT          = 1.0;
    this.flyFrom       = new THREE.Vector3();
    this.flyToTarget   = new THREE.Vector3();
    this.flyStartZoom  = 0;
    this.flyEndZoom    = 0;
    this.flyDuration   = 2.2; // seconds

    this._initPointer();
    this._initWheel();
    this._initKeyboard();
    this._updateCameraPositionsInstant();
  }

  _initPointer() {
    let isDown = false;
    let isRight = false;
    let lastX = 0, lastY = 0;

    this.dom.addEventListener('pointerdown', (e) => {
      // User interaction interrupts ongoing fly-to
      if (this.flyActive) {
        this.flyActive = false;
        this.targetGoal.copy(this.target);
        this.targetLogZoom = this.logZoom;
      }

      if (e.button === 2 || e.shiftKey) {
        isRight = true;
      } else {
        isDown = true;
      }
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    });

    this.dom.addEventListener('pointermove', (e) => {
      if (!isDown && !isRight) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      if (isRight) {
        // Pan target along camera right/up vectors
        const panSpeed = this.radius * 0.0009;
        const forward = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();

        this.targetGoal.addScaledVector(right, -dx * panSpeed);
        this.targetGoal.y += dy * panSpeed;
      } else {
        // Orbit azimuth and altitude with damping target
        this.targetAzimuth  -= dx * 0.0032;
        this.targetAltitude  = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, this.targetAltitude - dy * 0.0032));
      }

      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      isDown = false;
      isRight = false;
    });

    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _initWheel() {
    this.dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.flyActive) {
        this.flyActive = false;
        this.targetGoal.copy(this.target);
      }

      // Smooth proportional delta
      const delta = (e.deltaY < 0 ? 0.20 : -0.20);
      this.targetLogZoom = Math.max(this.minLog, Math.min(this.maxLog, this.targetLogZoom + delta));
    }, { passive: false });
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const step = 0.12;
      let handled = false;

      switch (e.key) {
        case 'w':
        case 'ArrowUp':
          this.targetAltitude = Math.min(Math.PI / 2 - 0.05, this.targetAltitude + step * 0.5);
          handled = true;
          break;
        case 's':
        case 'ArrowDown':
          this.targetAltitude = Math.max(0.05, this.targetAltitude - step * 0.5);
          handled = true;
          break;
        case 'a':
        case 'ArrowLeft':
          this.targetAzimuth += step * 0.8;
          handled = true;
          break;
        case 'd':
        case 'ArrowRight':
          this.targetAzimuth -= step * 0.8;
          handled = true;
          break;
        case '+':
        case '=':
          this.targetLogZoom = Math.min(this.maxLog, this.targetLogZoom + 0.35);
          handled = true;
          break;
        case '-':
        case '_':
          this.targetLogZoom = Math.max(this.minLog, this.targetLogZoom - 0.35);
          handled = true;
          break;
        case 'Escape':
          this.stepBackScale();
          handled = true;
          break;
      }

      if (handled) e.preventDefault();
    });
  }

  stepBackScale() {
    if (this.scaleLevel === SCALE.SYSTEM) {
      this.flyTo(this.targetGoal, 2.2); // back to local
    } else if (this.scaleLevel === SCALE.LOCAL) {
      this.flyTo(new THREE.Vector3(0, 0, 0), 0.2); // back to galaxy
    }
  }

  _calcRadius(zoom) {
    // Piecewise smooth radius mapping ensuring optimal system and galaxy framing
    if (zoom < 1.4) {
      // Galaxy scale: 95,000 ly down to 12,000 ly
      const t = zoom / 1.4;
      return 95000 * Math.pow(0.126, t);
    } else if (zoom < 3.2) {
      // Local stellar scale: 12,000 ly down to 80 ly
      const t = (zoom - 1.4) / 1.8;
      return 12000 * Math.pow(0.0066, t);
    } else {
      // System view (AU): 5,500 down to 380 units
      const t = (zoom - 3.2) / (this.maxLog - 3.2);
      return 5500 * Math.pow(0.069, t);
    }
  }

  _updateScaleLevel() {
    const prev = this.scaleLevel;
    if (this.logZoom < 1.4)       this.scaleLevel = SCALE.GALAXY;
    else if (this.logZoom < 3.2)  this.scaleLevel = SCALE.LOCAL;
    else                          this.scaleLevel = SCALE.SYSTEM;

    if (this.scaleLevel !== prev) {
      this.dom.dispatchEvent(new CustomEvent('scalelevelchange', {
        detail: { scaleLevel: this.scaleLevel, logZoom: this.logZoom }
      }));
    }
  }

  _updateCameraPositionsInstant() {
    this.radius = this._calcRadius(this.logZoom);
    this.camera.position.set(
      this.target.x + this.radius * Math.cos(this.altitude) * Math.sin(this.azimuth),
      this.target.y + this.radius * Math.sin(this.altitude),
      this.target.z + this.radius * Math.cos(this.altitude) * Math.cos(this.azimuth)
    );
    this.camera.lookAt(this.target);
  }

  flyTo(worldPos, targetLogZoom = 4.0, reducedMotion = false) {
    if (reducedMotion) {
      this.target.copy(worldPos);
      this.targetGoal.copy(worldPos);
      this.logZoom = targetLogZoom;
      this.targetLogZoom = targetLogZoom;
      this._updateScaleLevel();
      this._updateCameraPositionsInstant();
      this._emitCameraMove();
      return;
    }

    this.flyFrom.copy(this.target);
    this.flyToTarget.copy(worldPos);
    this.flyStartZoom = this.logZoom;
    this.flyEndZoom   = targetLogZoom;
    this.flyActive    = true;
    this.flyT         = 0;

    const dist = this.flyFrom.distanceTo(this.flyToTarget);
    this.flyDuration = Math.max(1.4, Math.min(2.8, 1.2 + Math.log10(dist + 1) * 0.3));
  }

  update(dt) {
    const frameDt = Math.min(dt, 0.1);

    if (this.flyActive) {
      this.flyT = Math.min(1.0, this.flyT + frameDt / this.flyDuration);

      // Smooth Quintic Curve (Perlin smoothstep): 6t^5 - 15t^4 + 10t^3
      const t = this.flyT * this.flyT * this.flyT * (this.flyT * (this.flyT * 6 - 15) + 10);

      this.target.lerpVectors(this.flyFrom, this.flyToTarget, t);
      this.targetGoal.copy(this.target);

      // Arc pull-back during mid-flight to avoid disorientation
      const arcD = Math.sin(this.flyT * Math.PI) * 0.45;
      const interpolatedZoom = this.flyStartZoom + (this.flyEndZoom - this.flyStartZoom) * t - arcD;
      this.logZoom = interpolatedZoom;
      this.targetLogZoom = this.flyEndZoom;

      if (this.flyT >= 1.0) {
        this.flyActive = false;
        this.logZoom = this.flyEndZoom;
      }
    } else {
      // Exponential frame-independent damping for zoom and rotation
      const zoomDamp = 1.0 - Math.exp(-12.0 * frameDt);
      this.logZoom += (this.targetLogZoom - this.logZoom) * zoomDamp;

      const rotDamp = 1.0 - Math.exp(-14.0 * frameDt);
      this.azimuth += (this.targetAzimuth - this.azimuth) * rotDamp;
      this.altitude += (this.targetAltitude - this.altitude) * rotDamp;

      const panDamp = 1.0 - Math.exp(-10.0 * frameDt);
      this.target.lerp(this.targetGoal, panDamp);
    }

    this._updateScaleLevel();
    this._updateCameraPositionsInstant();
    this._emitCameraMove();
  }

  _emitCameraMove() {
    this.dom.dispatchEvent(new CustomEvent('cameramove', {
      detail: {
        target: this.target,
        radius: this.radius,
        logZoom: this.logZoom,
        cameraPos: this.camera.position
      }
    }));
  }
}
