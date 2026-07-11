// ============================================================
// Signal City — Camera Rig with Touch Support
// Mouse: right-drag rotate, ctrl+right-drag pan, wheel zoom
// Touch: one-finger pan, two-finger pinch zoom + twist rotate
// Tap: selection via callback, double-tap: focus district
// ============================================================

import * as THREE from "three";

const DEG2RAD = Math.PI / 180;

export const CAMERA_CONFIG = {
  rotationSensitivity: 0.5,
  zoomSensitivity: 0.02,
  panSensitivity: 0.014,
  minRadius: 5,
  maxRadius: 30,
  minElevation: 28,
  maxElevation: 72,
  panLimit: 10,
  // Touch thresholds
  tapMaxMovement: 6,
  tapMaxDuration: 250,
  doubleTapWindow: 300,
} as const;

export interface CameraRigCallbacks {
  onTap?: (screenX: number, screenY: number) => void;
  onDoubleTap?: (screenX: number, screenY: number) => void;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly target = new THREE.Vector3(0, 0.25, 0);
  private radius = 18;
  private azimuth = 225;
  private elevation = 50;
  private readonly callbacks: CameraRigCallbacks;

  // Touch state
  private pointers = new Map<number, PointerState>();
  private lastTapTime = 0;
  private isDragging = false;

  constructor(
    private readonly element: HTMLCanvasElement,
    callbacks: CameraRigCallbacks = {},
  ) {
    this.callbacks = callbacks;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 150);

    // Canvas touch action
    element.style.touchAction = "none";
    element.style.userSelect = "none";
    (element.style as unknown as Record<string, string>).webkitUserSelect = "none";

    // Events
    element.addEventListener("contextmenu", this.preventContextMenu);
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerup", this.onPointerUp);
    element.addEventListener("pointercancel", this.onPointerUp);
    element.addEventListener("pointerleave", this.onPointerUp);
    element.addEventListener("wheel", this.onWheel, { passive: false });

    this.updateCamera();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  /** Focus camera on a world position. */
  focusOn(position: THREE.Vector3, duration = 0.6): void {
    const startTarget = this.target.clone();
    const endTarget = position.clone();
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out
      const ease = 1 - Math.pow(1 - t, 3);
      this.target.lerpVectors(startTarget, endTarget, ease);
      this.updateCamera();
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  dispose(): void {
    this.element.removeEventListener("contextmenu", this.preventContextMenu);
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerUp);
    this.element.removeEventListener("pointerleave", this.onPointerUp);
    this.element.removeEventListener("wheel", this.onWheel);
    this.element.style.touchAction = "";
    this.element.style.userSelect = "";
    (this.element.style as unknown as Record<string, string>).webkitUserSelect = "";
  }

  // ---- Input handlers ----

  private readonly preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.element.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      prevX: event.clientX,
      prevY: event.clientY,
      startTime: performance.now(),
    });

    // Track previous pinch distance
    if (this.pointers.size === 2) {
      this.pinchStartDist = this.getPinchDist();
      this.pinchStartAzimuth = this.azimuth;
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const state = this.pointers.get(event.pointerId);
    if (!state) return;

    const dx = event.clientX - state.prevX;
    const dy = event.clientY - state.prevY;
    state.prevX = event.clientX;
    state.prevY = event.clientY;

    const totalDx = event.clientX - state.startX;
    const totalDy = event.clientY - state.startY;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

    // Track drag state
    if (!this.isDragging && totalDist > CAMERA_CONFIG.tapMaxMovement) {
      this.isDragging = true;
    }

    if (this.pointers.size === 1) {
      // Single pointer — mouse right-drag or touch one-finger
      if (event.pointerType === "mouse" && (event.buttons & 2) === 0) return;

      if (event.pointerType === "mouse" && event.ctrlKey) {
        // Pan
        const up = new THREE.Vector3(0, 1, 0);
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(up, this.azimuth * DEG2RAD);
        const left = new THREE.Vector3(1, 0, 0).applyAxisAngle(up, this.azimuth * DEG2RAD);
        this.target.addScaledVector(forward, dy * CAMERA_CONFIG.panSensitivity);
        this.target.addScaledVector(left, dx * CAMERA_CONFIG.panSensitivity);
        this.clampTarget();
      } else if (event.pointerType === "touch") {
        // One-finger touch = pan
        const up = new THREE.Vector3(0, 1, 0);
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(up, this.azimuth * DEG2RAD);
        const left = new THREE.Vector3(1, 0, 0).applyAxisAngle(up, this.azimuth * DEG2RAD);
        this.target.addScaledVector(forward, dy * CAMERA_CONFIG.panSensitivity * 1.5);
        this.target.addScaledVector(left, dx * CAMERA_CONFIG.panSensitivity * 1.5);
        this.clampTarget();
      } else {
        // Mouse right-drag = rotate
        this.azimuth -= dx * CAMERA_CONFIG.rotationSensitivity;
        this.elevation = THREE.MathUtils.clamp(
          this.elevation + dy * CAMERA_CONFIG.rotationSensitivity,
          CAMERA_CONFIG.minElevation,
          CAMERA_CONFIG.maxElevation,
        );
      }
    } else if (this.pointers.size === 2) {
      // Two-finger: pinch zoom + twist rotate
      const dist = this.getPinchDist();
      if (this.pinchStartDist && dist > 0) {
        const scale = this.pinchStartDist / dist;
        this.radius = THREE.MathUtils.clamp(
          this.radius * scale,
          CAMERA_CONFIG.minRadius,
          CAMERA_CONFIG.maxRadius,
        );
        this.pinchStartDist = dist;
      }

      const angle = this.getPinchAngle();
      if (this.pinchStartAngle !== undefined && this.pinchStartAzimuth !== undefined) {
        const delta = (angle - this.pinchStartAngle) * (180 / Math.PI);
        this.azimuth = this.pinchStartAzimuth + delta;
      }
    }

    this.updateCamera();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const state = this.pointers.get(event.pointerId);
    if (!state) {
      // Cleanup stray pointers
      this.pointers.delete(event.pointerId);
      if (this.pointers.size === 0) {
        this.isDragging = false;
        this.pinchStartDist = null;
        this.pinchStartAngle = undefined;
        this.pinchStartAzimuth = undefined;
      }
      return;
    }

    const duration = performance.now() - state.startTime;
    const totalDx = event.clientX - state.startX;
    const totalDy = event.clientY - state.startY;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

    // Detect tap
    if (
      !this.isDragging &&
      totalDist < CAMERA_CONFIG.tapMaxMovement &&
      duration < CAMERA_CONFIG.tapMaxDuration
    ) {
      const now = performance.now();
      if (
        this.lastTapTime > 0 &&
        now - this.lastTapTime < CAMERA_CONFIG.doubleTapWindow
      ) {
        // Double tap
        this.callbacks.onDoubleTap?.(event.clientX, event.clientY);
        this.lastTapTime = 0;
      } else {
        // Single tap
        this.callbacks.onTap?.(event.clientX, event.clientY);
        this.lastTapTime = now;
      }
    }

    this.pointers.delete(event.pointerId);
    if (this.pointers.size === 0) {
      this.isDragging = false;
      this.pinchStartDist = null;
      this.pinchStartAngle = undefined;
      this.pinchStartAzimuth = undefined;
    } else if (this.pointers.size === 1) {
      // Reset pinch tracking when going back to one finger
      this.pinchStartDist = null;
      this.pinchStartAngle = undefined;
      this.pinchStartAzimuth = undefined;
      // Reset the remaining pointer's prev position
      const remaining = [...this.pointers.values()][0];
      if (remaining) {
        remaining.prevX = remaining.prevX;
        remaining.prevY = remaining.prevY;
        remaining.startX = remaining.prevX;
        remaining.startY = remaining.prevY;
        remaining.startTime = performance.now();
      }
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const factor = Math.exp(event.deltaY * CAMERA_CONFIG.zoomSensitivity * 0.05);
    this.radius = THREE.MathUtils.clamp(
      this.radius * factor,
      CAMERA_CONFIG.minRadius,
      CAMERA_CONFIG.maxRadius,
    );
    this.updateCamera();
  };

  // ---- Pinch helpers ----

  private pinchStartDist: number | null = null;
  private pinchStartAngle: number | undefined;
  private pinchStartAzimuth: number | undefined;

  private getPinchDist(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    const dx = pts[0].prevX - pts[1].prevX;
    const dy = pts[0].prevY - pts[1].prevY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getPinchAngle(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    return Math.atan2(pts[0].prevY - pts[1].prevY, pts[0].prevX - pts[1].prevX);
  }

  // ---- Camera ----

  private updateCamera(): void {
    const azimuth = this.azimuth * DEG2RAD;
    const elevation = this.elevation * DEG2RAD;
    const horizontal = this.radius * Math.cos(elevation);
    this.camera.position.set(
      this.target.x + horizontal * Math.sin(azimuth),
      this.target.y + this.radius * Math.sin(elevation),
      this.target.z + horizontal * Math.cos(azimuth),
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  private clampTarget(): void {
    this.target.x = THREE.MathUtils.clamp(this.target.x, -CAMERA_CONFIG.panLimit, CAMERA_CONFIG.panLimit);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -CAMERA_CONFIG.panLimit, CAMERA_CONFIG.panLimit);
  }
}

interface PointerState {
  id: number;
  startX: number;
  startY: number;
  prevX: number;
  prevY: number;
  startTime: number;
}
