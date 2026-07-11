import * as THREE from "three";
export type SelectionMetadata = { id: string; label: string; kind: "district" | "road" | "vehicle"; detail: string };
declare module "three" { interface Object3DUserData { signalCitySelection?: SelectionMetadata } }
export class SelectionController {
  private readonly raycaster = new THREE.Raycaster(); private readonly pointer = new THREE.Vector2();
  constructor(private readonly canvas: HTMLCanvasElement, private readonly camera: THREE.Camera, private readonly roots: THREE.Object3D[], private readonly onSelection: (selection: SelectionMetadata | null) => void) { canvas.addEventListener("click", this.onClick); }
  dispose(): void { this.canvas.removeEventListener("click", this.onClick); }
  private readonly onClick = (event: MouseEvent): void => { const rect = this.canvas.getBoundingClientRect(); this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); this.raycaster.setFromCamera(this.pointer, this.camera); const hit = this.raycaster.intersectObjects(this.roots, true)[0]; let current: THREE.Object3D | null = hit?.object ?? null; while (current && !current.userData.signalCitySelection) current = current.parent; this.onSelection(current?.userData.signalCitySelection ?? null); };
}
