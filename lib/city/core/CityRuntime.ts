import * as THREE from "three";
import { GltfAssetLoader } from "@/lib/city/assets/GltfAssetLoader";
import { CameraRig, type CameraRigCallbacks } from "@/lib/city/camera/CameraRig";
import { FOUNDATION_WORLD } from "@/lib/city/domain/world";
import { resolveAssetId } from "@/lib/city/domain/rendererState";
import { FixedStepLoop } from "@/lib/city/core/FixedStepLoop";
import { SelectionController, type SelectionMetadata } from "@/lib/city/interaction/SelectionController";
import { getQualitySettings, type QualityTier } from "@/lib/city/performance/quality";
import { roadAsset, roadMask, roadRotation } from "@/lib/city/roads/topology";
import { CITY_ROADS } from "@/lib/city/layout/cityLayout";
import { RoadGraph } from "@/lib/city/traffic/RoadGraph";
import { TrafficPool } from "@/lib/city/traffic/TrafficPool";
import { applyDistrictStatus, applyGlobalWeather } from "@/lib/city/visuals/marketVisuals";
import { DISTRICT_SATELLITE_LAYOUT } from "@/lib/city/layout/districtLayout";
import { TrafficDebugController, type TrafficDebugLayer } from "@/lib/city/debug/TrafficDebugController";
import { isCityDebugEnabled, debugWarn } from "@/lib/city/debug/debugGate";
import { DistrictLabelSystem, buildLabelAnchors } from "@/lib/city/visuals/DistrictLabelSystem";
import { WeatherController } from "@/lib/city/visuals/WeatherController";
import type { CityWorldState, DistrictState } from "@/shared/contracts";

export class CityRuntime {
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly cameraRig: CameraRig;
  private readonly assets = new GltfAssetLoader();
  private readonly worldRoot = new THREE.Group();
  private readonly localResources: Array<THREE.BufferGeometry | THREE.Material> = [];
  private readonly loop: FixedStepLoop;
  private selection: SelectionController;
  private traffic: TrafficPool | null = null;
  private trafficDebug: TrafficDebugController | null = null;
  private readonly quality: ReturnType<typeof getQualitySettings>;
  private readonly labelSystem: DistrictLabelSystem;
  private readonly weatherController: WeatherController;
  private currentWorld: CityWorldState = FOUNDATION_WORLD;
  private sun: THREE.DirectionalLight | null = null;
  private disposed = false;
  private contextLost = false;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
    tier: QualityTier,
    onSelection: (selection: SelectionMetadata | null) => void,
    callbacks: CameraRigCallbacks,
  ) {
    this.quality = getQualitySettings(tier);

    // Attach context-lost/restored handlers BEFORE creating renderer
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: tier !== "battery-saver",
      powerPreference: "high-performance",
      // Preserve the drawing buffer so a context-restore can recover
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.cameraRig = new CameraRig(canvas, callbacks);
    this.scene.add(this.worldRoot);

    this.labelSystem = new DistrictLabelSystem(container, this.cameraRig.camera, {
      onSelect: (districtId) => {
        // Fire the same onSelection callback used by raycasting
        const district = this.currentWorld.districts.find((d) => d.id === districtId);
        if (district) {
          onSelection({
            id: district.id,
            label: district.label,
            kind: "district",
            detail: district.explanation.summary,
          });
        }
      },
      onHover: (districtId) => {
        this.labelSystem.hoverDistrict(districtId);
      },
      onHoverEnd: () => {
        this.labelSystem.hoverDistrict(null);
      },
    });
    this.weatherController = new WeatherController(this.scene, {
      mobileMode: tier === "battery-saver",
    });

    this.loop = new FixedStepLoop({
      update: (step) => this.update(step),
      render: () => {
        if (this.disposed || this.contextLost) return;
        this.renderer.render(this.scene, this.cameraRig.camera);
        this.labelSystem.update();
      },
    });

    this.selection = new SelectionController(
      canvas,
      this.cameraRig.camera,
      [this.worldRoot],
      (selection) => {
        if (selection?.kind === "vehicle") this.trafficDebug?.selectVehicle(selection.id);
        onSelection(selection);
      },
    );

    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  static async create(options: {
    canvas: HTMLCanvasElement;
    container: HTMLElement;
    qualityTier: QualityTier;
    onSelection: (selection: SelectionMetadata | null) => void;
    cameraCallbacks?: CameraRigCallbacks;
  }): Promise<CityRuntime> {
    const runtime = new CityRuntime(
      options.canvas,
      options.container,
      options.qualityTier,
      options.onSelection,
      options.cameraCallbacks ?? {},
    );
    await runtime.initialize();
    runtime.resize();
    runtime.loop.start();
    return runtime;
  }

  resize(): void {
    if (this.disposed || this.contextLost) return;
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatioCap));
    this.renderer.setSize(width, height, false);
    this.cameraRig.resize(width, height);
    this.labelSystem.resize(width, height);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    // Stop animation
    this.loop.stop();

    // Remove DOM listeners
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);

    // Dispose controllers
    this.selection.dispose();
    this.trafficDebug?.dispose();
    this.cameraRig.dispose();
    this.labelSystem.dispose();
    this.weatherController.dispose();

    // Dispose local geometries/materials
    for (const resource of this.localResources) {
      resource.dispose();
    }

    // Dispose GLB assets
    await this.assets.dispose();

    // Dispose renderer (releases GPU resources)
    // NOTE: Do NOT call forceContextLoss() — that kills the canvas for all future renderers.
    // React Strict Mode remounts components; the canvas must survive a dispose/remount cycle.
    this.renderer.dispose();
  }

  toggleTrafficDebug(layer: TrafficDebugLayer): boolean {
    if (!isCityDebugEnabled()) return false;
    return this.trafficDebug?.toggle(layer) ?? false;
  }

  // ---- WebGL context lifecycle ----

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault(); // Allow context restoration
    this.contextLost = true;
    this.loop.stop();
    console.warn("[CityRuntime] WebGL context lost — pausing renderer. The context may be restored.");
  };

  private readonly onContextRestored = (): void => {
    this.contextLost = false;
    if (!this.disposed) {
      this.loop.start();
      console.log("[CityRuntime] WebGL context restored — resuming renderer.");
    }
  };

  // ---- Visibility ----

  private readonly onVisibilityChange = (): void => {
    if (this.disposed || this.contextLost) return;
    if (document.hidden) this.loop.stop();
    else this.loop.start();
  };

  // ---- Initialization ----

  private async initialize(): Promise<void> {
    this.scene.background = new THREE.Color(0x101722);
    this.scene.fog = new THREE.Fog(0x101722, 8, 20);

    const hemisphere = new THREE.HemisphereLight(0xbfdcff, 0x263423, 1.8);
    const sun = new THREE.DirectionalLight(0xffefd0, 3.2);
    sun.position.set(-9, 16, 8);
    sun.castShadow = this.quality.shadows;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.normalBias = 0.025;
    this.sun = sun;
    this.scene.add(hemisphere, sun);

    const groundGeometry = new THREE.PlaneGeometry(
      CITY_ROADS.bounds.maxX - CITY_ROADS.bounds.minX + 4,
      CITY_ROADS.bounds.maxZ - CITY_ROADS.bounds.minZ + 4,
    );
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x26392f, roughness: 1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.worldRoot.add(ground);
    this.localResources.push(groundGeometry, groundMaterial);

    const roads = await Promise.all(
      CITY_ROADS.tiles.map(async (tile) => {
        const mask = roadMask(tile.connections);
        const road = await this.assets.create(roadAsset(mask));
        road.position.set(tile.coordinate[0], 0.005, tile.coordinate[1]);
        road.rotation.y += roadRotation(mask);
        road.userData.signalCitySelection = {
          id: `road-${tile.id}`,
          label: "Market Avenue",
          kind: "road",
          detail: "A compiled segment in the connected city road network.",
        };
        return road;
      }),
    );
    this.worldRoot.add(...roads);

    for (const district of FOUNDATION_WORLD.districts) {
      const districtRoot = new THREE.Group();
      districtRoot.name = `district-${district.id}`;
      districtRoot.position.set(...district.position);

      const selection = {
        id: district.id,
        label: district.label,
        kind: "district" as const,
        detail: `${district.weather.kind.replaceAll("_", " ")} · ${district.weather.severity} · ${Math.round(district.weather.confidence * 100)}% confidence — ${district.explanation.summary}`,
      };
      districtRoot.userData.signalCitySelection = selection;

      const landmark = await this.assets.create(resolveAssetId(district.assetId));
      landmark.userData.signalCitySelection = selection;
      districtRoot.add(landmark);

      const satellites = await Promise.all(
        DISTRICT_SATELLITE_LAYOUT.map(async (layout) => {
          const building = await this.assets.create(layout.assetId);
          building.position.set(...layout.position);
          building.rotation.y += layout.rotationY;
          building.userData.signalCitySelection = selection;
          if (!this.quality.shadows) {
            building.traverse((object) => {
              if (object instanceof THREE.Mesh) object.castShadow = false;
            });
          }
          return building;
        }),
      );
      districtRoot.add(...satellites);

      applyDistrictStatus(districtRoot, district);
      this.worldRoot.add(districtRoot);
    }

    const globalWeather =
      FOUNDATION_WORLD.districts.find((d) => d.scope === "global")?.weather.kind ?? "clear";
    applyGlobalWeather(this.scene, sun, globalWeather);

    const graph = new RoadGraph(CITY_ROADS);
    const validation = graph.validateConnectivity();
    if (isCityDebugEnabled() && validation.warnings.length) {
      debugWarn("Signal City road graph validation", validation.warnings);
    }

    const cars = await Promise.all(
      Array.from({ length: this.quality.carPoolSize }, async (_, index) => {
        const car = await this.assets.create("passenger-car");
        car.userData.signalCitySelection = {
          id: `vehicle-${index}`,
          label: "Market traffic",
          kind: "vehicle",
          detail: "A pooled vehicle following a directed lane route.",
        };
        return car;
      }),
    );
    this.worldRoot.add(...cars);
    this.traffic = new TrafficPool(graph, cars);

    if (isCityDebugEnabled()) {
      this.trafficDebug = new TrafficDebugController(graph);
      this.scene.add(this.trafficDebug.group);
    }

    // ---- Labels ----
    const anchors = buildLabelAnchors(FOUNDATION_WORLD.districts);
    this.labelSystem.createLabels(anchors);

    // ---- Weather ----
    for (const district of FOUNDATION_WORLD.districts) {
      const districtRoot = this.worldRoot.getObjectByName(`district-${district.id}`) as THREE.Group;
      if (districtRoot) {
        this.weatherController.applyToDistrict(districtRoot, district);
      }
    }
  }

  /** Apply a newer canonical city snapshot without rebuilding the scene. */
  applyWorldState(world: CityWorldState): void {
    if (this.disposed || this.contextLost) return;
    this.currentWorld = world;

    for (const district of world.districts) {
      const root = this.worldRoot.getObjectByName(`district-${district.id}`);
      if (!(root instanceof THREE.Group)) continue;
      applyDistrictStatus(root, district);
      this.weatherController.applyToDistrict(root, district);
      this.labelSystem.updateSubtitle(district.id, district.weather.kind.replaceAll("_", " "));
      root.userData.signalCitySelection = this.selectionMetadata(district);
      root.traverse((object) => {
        if (object.userData.signalCitySelection?.kind === "district") {
          object.userData.signalCitySelection = this.selectionMetadata(district);
        }
      });
    }

    const globalWeather = world.districts.find((district) => district.scope === "global")?.weather.kind;
    if (globalWeather && this.sun) applyGlobalWeather(this.scene, this.sun, globalWeather);
  }

  /** Focus camera on a district's position. */
  focusDistrict(districtId: string): void {
    const district = this.currentWorld.districts.find((d) => d.id === districtId);
    if (district) {
      const pos = new THREE.Vector3(district.position[0], district.position[1] + 4, district.position[2]);
      this.cameraRig.focusOn(pos);
    }
  }

  /** Get current camera rig for external focus/control. */
  get cameraRigInstance(): CameraRig { return this.cameraRig; }

  private selectionMetadata(district: DistrictState): SelectionMetadata {
    return {
      id: district.id,
      label: district.label,
      kind: "district",
      detail: `${district.weather.kind.replaceAll("_", " ")} · ${district.weather.severity} · ${Math.round(district.weather.confidence * 100)}% confidence — ${district.explanation.summary}`,
    };
  }

  private update(step: number): void {
    this.traffic?.update(step, this.currentWorld.districts, this.quality.animateVehicle);
    if (this.traffic && this.trafficDebug) {
      this.trafficDebug.update(this.traffic.snapshot());
    }
    this.weatherController.update(step);
  }
}
