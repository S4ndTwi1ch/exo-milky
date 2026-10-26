/**
 * GODS-EYE CAMERA CONTROLLER
 * Logarithmic zoom (Galaxy -> Local Neighborhood -> System view)
 * Floating-origin offset, keyboard navigation (WASD, Arrows, +/-, Esc),
 * interruptible eased fly-to transitions.
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
    this.logZoom = 0;      // 0 = full galaxy overview
    this.minLog  = -0.5;   // ~160,000 ly
    this.maxLog  = 5.4;    // ~10 AU

    // Orbit coordinates
    this.azimuth  = 0.4;
    this.altitude = Math.PI / 3.2; // ~56 deg above galactic plane
    this.radius   = 95000;         // ly

    // Target origin
    this.target = new THREE.Vector3(0, 0, 0);

    // Fly-to animation state
    this.flyActive   = false;
    this.flyT        = 1;
    this.flyFrom     = new THREE.Vector3();
    this.flyToTarget = new THREE.Vector3();
    this.flyStartZoom= 0;
    this.flyEndZoom  = 0;
    this.flyDuration = 2.0; // seconds

    this._initPointer();
    this._initWheel();
    this._initKeyboard();
    this._updateCamera();
  }

  _initPointer() {
    let down = false, lastX = 0, lastY = 0;
    let rightDown = false;

    this.dom.addEventListener('pointerdown', e => {
      // Interrupt fly-to on manual user drag
      if (this.flyActive) this.flyActive = false;

      if (e.button === 2 || e.shiftKey) {
        rightDown = true;
      } else {
        down = true;
      }
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    });

    this.dom.addEventListener('pointermove', e => {
      if (!down && !rightDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      if (rightDown) {
        // Pan target in screen plane
        const panSpeed = this.radius * 0.0012;
        const forward = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
        this.target.addScaledVector(right, -dx * panSpeed);
        this.target.y += dy * panSpeed;
      } else {
        // Orbit azimuth and altitude
        this.azimuth  -= dx * 0.0035;
        this.altitude  = Math.max(0.04, Math.min(Math.PI / 2 - 0.04, this.altitude - dy * 0.0035));
      }

      lastX = e.clientX;
      lastY = e.clientY;
      this._updateCamera();
      this._emitCameraMove();
    });

    window.addEventListener('pointerup', () => {
      down = false;
      rightDown = false;
    });

    this.dom.addEventListener('contextmenu', e => e.preventDefault());
  }

  _initWheel() {
    this.dom.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.flyActive) this.flyActive = false;

      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      this.setLogZoom(this.logZoom + delta);
    }, { passive: false });
  }

  _initKeyboard() {
    window.addEventListener('keydown', e => {
      // Ignore if focus is in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      let handled = false;
      const step = 0.08;

      switch (e.key) {
        case 'w':
        case 'ArrowUp':
          this.altitude = Math.min(Math.PI / 2 - 0.04, this.altitude + step * 0.4);
          handled = true;
          break;
        case 's':
        case 'ArrowDown':
          this.altitude = Math.max(0.04, this.altitude - step * 0.4);
          handled = true;
          break;
        case 'a':
        case 'ArrowLeft':
          this.azimuth += step * 0.6;
          handled = true;
          break;
        case 'd':
        case 'ArrowRight':
          this.azimuth -= step * 0.6;
          handled = true;
          break;
        case '+':
        case '=':
          this.setLogZoom(this.logZoom + 0.25);
          handled = true;
          break;
        case '-':
        case '_':
          this.setLogZoom(this.logZoom - 0.25);
          handled = true;
          break;
        case 'Escape':
          this.stepBackScale();
          handled = true;
          break;
      }

      if (handled) {
        this._updateCamera();
        this._emitCameraMove();
      }
    });
  }

  setLogZoom(val) {
    this.logZoom = Math.max(this.minLog, Math.min(this.maxLog, val));
    // Multiplicative logarithmic radius
    this.radius = 95000 * Math.pow(10, -this.logZoom * 0.82);
    this._updateScaleLevel();
    this._updateCamera();
    this._emitCameraMove();
  }

  stepBackScale() {
    if (this.scaleLevel === SCALE.SYSTEM) {
      this.flyTo(this.target, 2.2); // back to local
    } else if (this.scaleLevel === SCALE.LOCAL) {
      this.flyTo(new THREE.Vector3(0, 0, 0), 0.2); // back to galaxy
    }
  }

  _updateScaleLevel() {
    const prev = this.scaleLevel;
    if (this.logZoom < 1.4)       this.scaleLevel = SCALE.GALAXY;
    else if (this.logZoom < 3.6)  this.scaleLevel = SCALE.LOCAL;
    else                          this.scaleLevel = SCALE.SYSTEM;

    if (this.scaleLevel !== prev) {
      this.dom.dispatchEvent(new CustomEvent('scalelevelchange', {
        detail: { scaleLevel: this.scaleLevel, logZoom: this.logZoom }
      }));
    }
  }

  _updateCamera() {
    const r = this.radius;
    this.camera.position.set(
      this.target.x + r * Math.cos(this.altitude) * Math.sin(this.azimuth),
      this.target.y + r * Math.sin(this.altitude),
      this.target.z + r * Math.cos(this.altitude) * Math.cos(this.azimuth)
    );
    this.camera.lookAt(this.target);
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

  flyTo(worldPos, targetLogZoom = 3.8, reducedMotion = false) {
    if (reducedMotion) {
      this.target.copy(worldPos);
      this.setLogZoom(targetLogZoom);
      this._updateCamera();
      this._emitCameraMove();
      return;
    }

    this.flyFrom.copy(this.target);
    this.flyToTarget.copy(worldPos);
    this.flyStartZoom = this.logZoom;
    this.flyEndZoom   = targetLogZoom;
    this.flyActive    = true;
    this.flyT         = 0;

    // Duration scaled by distance (1.2s to 3.0s)
    const dist = this.flyFrom.distanceTo(this.flyToTarget);
    this.flyDuration = Math.max(1.2, Math.min(3.0, 1.2 + Math.log10(dist + 1) * 0.35));
  }

  update(dtSeconds) {
    if (this.flyActive) {
      this.flyT = Math.min(1.0, this.flyT + dtSeconds / this.flyDuration);
      // Smooth cubic ease-in-out
      const t = this.flyT < 0.5
        ? 4 * this.flyT * this.flyT * this.flyT
        : 1 - Math.pow(-2 * this.flyT + 2, 3) / 2;

      this.target.lerpVectors(this.flyFrom, this.flyToTarget, t);
      this.setLogZoom(this.flyStartZoom + (this.flyEndZoom - this.flyStartZoom) * t);

      if (this.flyT >= 1.0) {
        this.flyActive = false;
      }
      this._updateCamera();
      this._emitCameraMove();
    }
  }
}
