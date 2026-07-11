// ============================================================
// Signal City — District Label System
// CSS2D world-space labels anchored above districts.
// ============================================================

import * as THREE from "three";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { DistrictState } from "@/shared/contracts";

// ---- Types ----

export type LabelKind = "main-district" | "sector-zone";

export interface LabelAnchor {
  id: string;
  position: THREE.Vector3;
  kind: LabelKind;
  label: string;
  subtitle?: string;
}

export interface LabelInstance {
  id: string;
  object: CSS2DObject;
  anchor: LabelAnchor;
  kind: LabelKind;
  element: HTMLElement;
}

// ---- Label Anchors (canonical positions) ----

export function buildLabelAnchors(districts: DistrictState[]): LabelAnchor[] {
  const anchors: LabelAnchor[] = [];

  for (const d of districts) {
    const pos = new THREE.Vector3(
      d.position[0],
      d.position[1] + 4.5, // above building
      d.position[2],
    );

    const isMain = d.id === "claims" || d.id === "entry-gate" || d.id === "portfolio";

    anchors.push({
      id: d.id,
      position: pos,
      kind: isMain ? "main-district" : "sector-zone",
      label: d.id === "claims" ? "Claims Bureau" :
             d.id === "entry-gate" ? "Entry Gate" :
             d.id === "portfolio" ? "Portfolio Clinic" :
             d.label,
      subtitle: d.weather.kind.replace(/_/g, " "),
    });
  }

  // Add "The Weather Grid" label above center
  anchors.push({
    id: "weather-grid",
    position: new THREE.Vector3(0, 7, 0),
    kind: "main-district",
    label: "The Weather Grid",
    subtitle: "Market Intelligence",
  });

  return anchors;
}

// ---- Label System ----

export class DistrictLabelSystem {
  private labels: LabelInstance[] = [];
  private readonly group = new THREE.Group();
  private readonly camera: THREE.Camera;
  private readonly domElement: HTMLElement;
  private css2DRenderer: CSS2DRenderer | null = null;
  private selectedId: string | null = null;
  private hoveredId: string | null = null;

  constructor(container: HTMLElement, camera: THREE.Camera) {
    this.camera = camera;
    this.domElement = container;
    this.setupCSS2DRenderer();
  }

  get sceneGroup(): THREE.Group {
    return this.group;
  }

  /** Create all labels from anchor data. Call once during initialize. */
  createLabels(anchors: LabelAnchor[]): void {
    this.clear();

    for (const anchor of anchors) {
      const element = this.createElement(anchor);
      const object = new CSS2DObject(element);
      object.position.copy(anchor.position);
      object.name = `label-${anchor.id}`;
      object.userData.labelAnchor = anchor;

      // Add location marker (diamond beneath label)
      const marker = this.createLocationMarker(anchor);
      object.add(marker);

      this.group.add(object);
      this.labels.push({
        id: anchor.id,
        object,
        anchor,
        kind: anchor.kind,
        element,
      });
    }
  }

  /** Update labels each frame: face camera, fade by distance, scale. */
  update(): void {
    const cameraPos = this.camera.position.clone();
    const cameraForward = new THREE.Vector3();
    this.camera.getWorldDirection(cameraForward);

    for (const instance of this.labels) {
      const { object, anchor, kind } = instance;
      const worldPos = new THREE.Vector3();
      object.getWorldPosition(worldPos);

      // Face the camera
      object.lookAt(
        worldPos.x + cameraForward.x,
        worldPos.y + cameraForward.y,
        worldPos.z + cameraForward.z,
      );

      // Distance-based fade
      const dist = cameraPos.distanceTo(worldPos);
      const isSelected = instance.id === this.selectedId;
      const isHovered = instance.id === this.hoveredId;

      // Main districts visible further, sector zones fade sooner
      const maxDist = kind === "main-district" ? 40 : 25;
      const minDist = 3;
      const fadeRange = maxDist - minDist;
      let opacity = 1;
      if (dist > maxDist) {
        opacity = 0;
      } else if (dist > maxDist - fadeRange * 0.3) {
        opacity = Math.max(0, (maxDist - dist) / (fadeRange * 0.3));
      }

      // Highlight selected/hovered
      if (isSelected) opacity = 1;
      if (isHovered) opacity = Math.max(opacity, 0.85);

      instance.element.style.opacity = String(opacity);
      instance.element.style.pointerEvents = opacity > 0.1 ? "auto" : "none";

      // Scale modestly with distance (closer = larger, far = smaller)
      const baseScale = kind === "main-district" ? 1.2 : 0.85;
      const scale = baseScale * THREE.MathUtils.clamp(1 + (8 - dist) * 0.03, 0.7, 1.3);
      object.scale.setScalar(scale);

      // Hide when behind camera
      const toLabel = worldPos.clone().sub(cameraPos).normalize();
      const dot = toLabel.dot(cameraForward);
      if (dot < -0.1 && !isSelected) {
        instance.element.style.opacity = "0";
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.css2DRenderer as any)?.render(this.group, this.camera);
  }

  /** Mark a district as selected. */
  selectDistrict(id: string | null): void {
    this.selectedId = id;
    for (const instance of this.labels) {
      instance.element.classList.toggle("label-selected", instance.id === id);
    }
  }

  /** Mark a district as hovered. */
  hoverDistrict(id: string | null): void {
    this.hoveredId = id;
    for (const instance of this.labels) {
      instance.element.classList.toggle("label-hovered", instance.id === id);
    }
  }

  /** Update subtitle (weather state) for a label. */
  updateSubtitle(id: string, subtitle: string): void {
    const instance = this.labels.find((l) => l.id === id);
    if (instance) {
      const subtitleEl = instance.element.querySelector(".label-subtitle");
      if (subtitleEl) subtitleEl.textContent = subtitle;
    }
  }

  /** Resize handler — update CSS2D renderer size. */
  resize(width: number, height: number): void {
    this.css2DRenderer?.setSize(width, height);
  }

  dispose(): void {
    this.clear();
    this.css2DRenderer?.domElement.remove();
    this.css2DRenderer = null;
  }

  getDomElement(): HTMLElement | null {
    return this.css2DRenderer?.domElement ?? null;
  }

  // ---- Private ----

  private setupCSS2DRenderer(): void {
    this.css2DRenderer = new CSS2DRenderer();
    this.css2DRenderer.setSize(
      this.domElement.clientWidth,
      this.domElement.clientHeight,
    );
    this.css2DRenderer.domElement.style.position = "absolute";
    this.css2DRenderer.domElement.style.top = "0";
    this.css2DRenderer.domElement.style.left = "0";
    this.css2DRenderer.domElement.style.pointerEvents = "none";
    this.css2DRenderer.domElement.style.zIndex = "10";
    this.domElement.appendChild(this.css2DRenderer.domElement);
  }

  private createElement(anchor: LabelAnchor): HTMLElement {
    const el = document.createElement("div");
    el.className = `district-label ${anchor.kind}`;
    el.innerHTML = `
      <div class="label-text">${anchor.label}</div>
      ${anchor.subtitle ? `<div class="label-subtitle">${anchor.subtitle}</div>` : ""}
    `;
    el.addEventListener("pointerenter", () => { this.hoveredId = anchor.id; });
    el.addEventListener("pointerleave", () => { this.hoveredId = null; });
    return el;
  }

  private createLocationMarker(anchor: LabelAnchor): THREE.Object3D {
    const size = anchor.kind === "main-district" ? 0.4 : 0.25;
    const geometry = new THREE.RingGeometry(size * 0.6, size, 4);
    const material = new THREE.MeshBasicMaterial({
      color: anchor.kind === "main-district" ? 0x72df9b : 0x9eb0a8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.y = -anchor.position.y + (anchor.kind === "main-district" ? 4.0 : 3.5);
    marker.rotation.x = -Math.PI / 2;
    return marker;
  }

  private clear(): void {
    for (const instance of this.labels) {
      this.group.remove(instance.object);
    }
    this.labels = [];
  }
}
