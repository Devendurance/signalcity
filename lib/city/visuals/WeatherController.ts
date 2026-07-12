// ============================================================
// Signal City — Weather Controller
// Per-district weather effects. No global fog. No flat planes.
// Uses CloudSystem for low-poly 3D clouds.
// ============================================================

import * as THREE from "three";
import type { DistrictState, WeatherSeverity } from "@/shared/contracts";
import {
  CloudSystem,
  densityFromWeather,
  type CloudClusterConfig,
} from "./CloudSystem";

// ---- Types ----

export interface WeatherControllerConfig {
  mobileMode: boolean;
}

interface StormState {
  light: THREE.PointLight;
  timer: number;
}

// ---- Weather Controller ----

export class WeatherController {
  private readonly scene: THREE.Scene;
  private readonly mobileMode: boolean;
  private readonly clouds: CloudSystem;

  // Per-district state
  private readonly stormStates = new Map<string, StormState>();
  private readonly districtWeather = new Map<string, string>(); // id → weatherKind

  // Rain (shared pool)
  private rainPool: THREE.Points | null = null;
  private rainGeometry: THREE.BufferGeometry | null = null;
  private rainVelocities: Float32Array | null = null;
  private rainCount = 0;

  constructor(scene: THREE.Scene, config: Partial<WeatherControllerConfig> = {}) {
    this.scene = scene;
    this.mobileMode = config.mobileMode ?? false;
    this.clouds = new CloudSystem(scene);
  }

  // ---- Public API ----

  /** Apply weather to a district. Called on init and when weather changes. */
  applyToDistrict(group: THREE.Group, district: DistrictState): void {
    const { id } = district;
    const { kind, severity } = district.weather;
    const previousKind = this.districtWeather.get(id);
    this.districtWeather.set(id, kind);

    if (previousKind === "storm" && kind !== "storm") {
      const priorStorm = this.stormStates.get(id);
      priorStorm?.light.removeFromParent();
      this.stormStates.delete(id);
    }

    // Reset building emissive
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive?.set(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }
    });

    // Update clouds
    const density = densityFromWeather(kind);
    if (density) {
      const center = new THREE.Vector3(district.position[0], district.position[1], district.position[2]);
      const config: CloudClusterConfig = {
        center,
        radius: 4.5,
        density,
        driftSpeed: kind === "storm" ? 1.2 : 0.4,
        driftDirection: new THREE.Vector3(0.6, 0, 0.3),
      };
      this.clouds.setDistrictClouds(id, config);
    } else {
      this.clouds.removeDistrictClouds(id);
    }

    // Per-weather effects
    switch (kind) {
      case "clear":
        this.applyClear(group);
        break;
      case "partly_cloudy":
        this.applyClear(group);
        break;
      case "fog":
        this.applyFog(group);
        break;
      case "rain":
        this.applyRain(group);
        break;
      case "storm":
        this.applyStorm(group, district);
        break;
      case "heatwave":
        this.applyHeatwave(group, severity);
        break;
      case "wind_advisory":
        this.applyWindAdvisory(group);
        break;
      case "cold_snap":
        this.applyColdSnap(group, severity);
        break;
    }
  }

  /** Called each frame. */
  update(dt: number): void {
    this.clouds.update(dt);
    this.updateRain(dt);
    this.updateStorms(dt);
  }

  dispose(): void {
    this.clouds.dispose();
    for (const [, state] of this.stormStates) {
      state.light.removeFromParent();
    }
    this.stormStates.clear();
    this.rainPool?.removeFromParent();
    this.rainGeometry?.dispose();
    (this.rainPool?.material as THREE.Material)?.dispose();
    this.rainPool = null;
    this.rainGeometry = null;
  }

  // ---- Weather Implementations ----

  private applyClear(group: THREE.Group): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive?.set(0x111100);
            mat.emissiveIntensity = 0.04;
          }
        }
      }
    });
  }

  private applyFog(group: THREE.Group): void {
    // Cool, dim lighting — no flat planes
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive?.set(0x334455);
            mat.emissiveIntensity = 0.06;
          }
        }
      }
    });
  }

  private applyRain(group: THREE.Group): void {
    this.applyFog(group);
    this.ensureRainPool();
  }

  private applyStorm(
    group: THREE.Group,
    district: DistrictState,
  ): void {
    this.ensureRainPool();

    // Dark buildings
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive?.set(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }
    });

    // Lightning
    if (!this.stormStates.has(district.id)) {
      const light = new THREE.PointLight(0xaaccff, 0, 30);
      light.position.set(district.position[0], 8, district.position[2]);
      this.scene.add(light);
      this.stormStates.set(district.id, { light, timer: 2 + Math.random() * 4 });
    }
  }

  private applyHeatwave(group: THREE.Group, severity: WeatherSeverity): void {
    const intensity = severity === "critical" ? 0.35 : severity === "high" ? 0.22 : 0.12;
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive?.set(0xff4400);
            mat.emissiveIntensity = intensity;
          }
        }
      }
    });
  }

  private applyWindAdvisory(group: THREE.Group): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive?.set(0x111122);
            mat.emissiveIntensity = 0.08;
          }
        }
      }
    });
  }

  private applyColdSnap(group: THREE.Group, severity: WeatherSeverity): void {
    const intensity = severity === "critical" ? 0.25 : 0.12;
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive?.set(0x3344aa);
            mat.emissiveIntensity = intensity;
          }
        }
      }
    });
  }

  // ---- Rain Pool ----

  private ensureRainPool(): void {
    if (this.rainPool) return;

    const count = this.mobileMode ? 600 : 2000;
    this.rainCount = count;

    const positions = new Float32Array(count * 3);
    this.rainVelocities = new Float32Array(count);

    const spreadX = 30;
    const spreadZ = 30;
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = 2 + Math.random() * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;
      this.rainVelocities[i] = 8 + Math.random() * 14;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement("canvas");
    canvas.width = 2; canvas.height = 12;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#aaccff";
    ctx.fillRect(0, 0, 2, 12);
    const texture = new THREE.CanvasTexture(canvas);

    this.rainPool = new THREE.Points(
      this.rainGeometry,
      new THREE.PointsMaterial({
        color: 0x8899cc,
        size: 0.06,
        map: texture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.rainPool.name = "weather-rain";
    this.rainPool.renderOrder = 2;
    this.scene.add(this.rainPool);
  }

  private updateRain(dt: number): void {
    if (!this.rainPool || !this.rainGeometry || !this.rainVelocities) return;

    // Show rain only while at least one district needs it.
    const hasRainDistrict = [...this.districtWeather.values()].some(
      (w) => w === "rain" || w === "storm",
    );
    this.rainPool.visible = hasRainDistrict;

    if (!hasRainDistrict) return;

    const positions = this.rainGeometry.attributes.position.array as Float32Array;
    const spreadX = 30;
    const spreadZ = 30;
    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 1] -= this.rainVelocities[i] * dt;
      if (positions[i * 3 + 1] < -1) {
        positions[i * 3 + 1] = 14 + Math.random() * 4;
        positions[i * 3] = (Math.random() - 0.5) * spreadX;
        positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;
      }
    }
    this.rainGeometry.attributes.position.needsUpdate = true;
  }

  private updateStorms(dt: number): void {
    for (const [, state] of this.stormStates) {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.light.intensity = 2 + Math.random() * 4;
        state.timer = 0.1;
        setTimeout(() => { state.light.intensity = 0; }, 60 + Math.random() * 60);
        state.timer = 3 + Math.random() * 8;
      }
    }
  }
}
