// ============================================================
// Signal City — Low-Poly Cloud System
// Procedural 3D cloud clusters matching the low-poly visual style.
// No flat planes. No rectangular backing. No external assets.
// ============================================================

import * as THREE from "three";

// ---- Types ----

export type CloudDensity = "light" | "medium" | "heavy" | "storm";

export interface CloudClusterConfig {
  center: THREE.Vector3;
  radius: number;
  density: CloudDensity;
  driftSpeed: number;
  driftDirection: THREE.Vector3;
}

export interface CloudClusterInstance {
  group: THREE.Group;
  config: CloudClusterConfig;
  lobes: THREE.Mesh[];
  active: boolean;
  opacity: number;
}

// ---- Shared Geometry Pool ----

// 3 lobe sizes for varied silhouette
const LOBE_GEOMETRIES: THREE.BufferGeometry[] = [
  new THREE.IcosahedronGeometry(0.55, 0),  // small
  new THREE.IcosahedronGeometry(0.75, 0),  // medium
  new THREE.IcosahedronGeometry(1.0, 1),   // large (detail 1 for slight rounding)
];

// Materials by density
function createCloudMaterial(density: CloudDensity): THREE.MeshLambertMaterial {
  const isDark = density === "storm" || density === "heavy";
  return new THREE.MeshLambertMaterial({
    color: isDark ? 0x667788 : 0xc8d8e8,
    emissive: isDark ? 0x111111 : 0x1a1a22,
    emissiveIntensity: 0.15,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: true,
  });
}

// ---- Cloud System ----

export class CloudSystem {
  private readonly scene: THREE.Scene;
  private readonly pool: CloudClusterInstance[] = [];
  private readonly active = new Map<string, CloudClusterInstance[]>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Spawn clouds for a district. Removes any previous clouds for that district. */
  setDistrictClouds(
    districtId: string,
    config: CloudClusterConfig,
  ): void {
    // Remove previous
    this.removeDistrictClouds(districtId);

    const configs = this.generateClusterConfigs(config);
    const instances: CloudClusterInstance[] = [];

    for (const cfg of configs) {
      const instance = this.createCluster(cfg);
      this.scene.add(instance.group);
      this.active.set(districtId, [
        ...(this.active.get(districtId) ?? []),
        instance,
      ]);
      instances.push(instance);
    }
  }

  /** Remove all clouds for a district (weather changed to clear). */
  removeDistrictClouds(districtId: string): void {
    const instances = this.active.get(districtId);
    if (!instances) return;

    for (const inst of instances) {
      inst.active = false;
      // Fade out then pool
      this.fadeOut(inst, () => {
        this.scene.remove(inst.group);
        this.pool.push(inst);
      });
    }
    this.active.delete(districtId);
  }

  /** Update all active clouds each frame. */
  update(dt: number): void {
    for (const [, instances] of this.active) {
      for (const inst of instances) {
        if (!inst.active) continue;

        // Drift
        const dir = inst.config.driftDirection;
        inst.group.position.x += dir.x * inst.config.driftSpeed * dt;
        inst.group.position.z += dir.z * inst.config.driftSpeed * dt;

        // Wrap around district bounds
        const dx = inst.group.position.x - inst.config.center.x;
        const dz = inst.group.position.z - inst.config.center.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > inst.config.radius) {
          // Wrap to opposite side
          inst.group.position.x = inst.config.center.x - dx * 0.8;
          inst.group.position.z = inst.config.center.z - dz * 0.8;
        }

        // Gentle bobbing
        inst.group.position.y += Math.sin(Date.now() * 0.0008 + inst.group.position.x) * dt * 0.3;

        // Rotate slowly
        inst.group.rotation.y += dt * 0.05;
      }
    }
  }

  dispose(): void {
    for (const [, instances] of this.active) {
      for (const inst of instances) {
        this.scene.remove(inst.group);
        this.disposeCluster(inst);
      }
    }
    this.active.clear();
    for (const inst of this.pool) {
      this.disposeCluster(inst);
    }
    this.pool.length = 0;
  }

  // ---- Private ----

  private generateClusterConfigs(
    district: CloudClusterConfig,
  ): CloudClusterConfig[] {
    const count = this.clusterCount(district.density);
    const configs: CloudClusterConfig[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = Math.random() * district.radius * 0.8;
      configs.push({
        center: new THREE.Vector3(
          district.center.x + Math.cos(angle) * dist,
          district.center.y,
          district.center.z + Math.sin(angle) * dist,
        ),
        radius: district.radius,
        density: district.density,
        driftSpeed: district.driftSpeed * (0.7 + Math.random() * 0.6),
        driftDirection: district.driftDirection.clone(),
      });
    }

    return configs;
  }

  private clusterCount(density: CloudDensity): number {
    switch (density) {
      case "light": return 2;
      case "medium": return 4;
      case "heavy": return 6;
      case "storm": return 8;
    }
  }

  private createCluster(config: CloudClusterConfig): CloudClusterInstance {
    const group = new THREE.Group();
    group.position.copy(config.center);
    group.position.y += 6 + Math.random() * 3;

    const material = createCloudMaterial(config.density);
    const lobeCount = config.density === "storm" ? 7 :
                      config.density === "heavy" ? 5 :
                      config.density === "medium" ? 4 : 3;

    const lobes: THREE.Mesh[] = [];
    const baseScale = config.density === "storm" ? 1.4 :
                      config.density === "heavy" ? 1.1 : 0.9;

    for (let i = 0; i < lobeCount; i++) {
      const geoIdx = Math.floor(Math.random() * LOBE_GEOMETRIES.length);
      const mesh = new THREE.Mesh(LOBE_GEOMETRIES[geoIdx], material.clone());

      // Position lobes in a rough cluster
      mesh.position.set(
        (Math.random() - 0.5) * 2.5 * baseScale,
        (Math.random() - 0.5) * 1.0 * baseScale,
        (Math.random() - 0.5) * 2.5 * baseScale,
      );

      // Vary scale slightly
      const s = baseScale * (0.6 + Math.random() * 0.8);
      mesh.scale.setScalar(s);

      // Vary opacity slightly within the material
      const mat = mesh.material as THREE.MeshLambertMaterial;
      mat.opacity = 0.85 + Math.random() * 0.15;

      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
      lobes.push(mesh);
    }

    return {
      group,
      config,
      lobes,
      active: true,
      opacity: 1,
    };
  }

  private fadeOut(
    instance: CloudClusterInstance,
    onComplete: () => void,
  ): void {
    const startTime = Date.now();
    const duration = 800;
    const startOpacity = instance.opacity;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      instance.opacity = startOpacity * (1 - t);

      for (const lobe of instance.lobes) {
        const mat = lobe.material as THREE.MeshLambertMaterial;
        mat.opacity = instance.opacity * 0.9;
        mat.transparent = true;
      }

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };
    requestAnimationFrame(tick);
  }

  private disposeCluster(instance: CloudClusterInstance): void {
    for (const lobe of instance.lobes) {
      (lobe.material as THREE.Material).dispose();
    }
    instance.lobes.length = 0;
  }
}

// ---- Helpers ----

export function densityFromWeather(
  kind: string,
): CloudDensity | null {
  switch (kind) {
    case "partly_cloudy": return "light";
    case "rain": return "heavy";
    case "storm": return "storm";
    default: return null;
  }
}
