export type FixedStepLoopOptions = { fixedStepSeconds?: number; maxDeltaSeconds?: number; update: (stepSeconds: number, simulationSeconds: number) => void; render: (alpha: number) => void };
export class FixedStepLoop {
  private readonly step: number; private readonly maxDelta: number; private readonly update: FixedStepLoopOptions["update"]; private readonly render: FixedStepLoopOptions["render"]; private frameId: number | null = null; private previousMs = 0; private accumulator = 0; private simulationSeconds = 0;
  constructor(options: FixedStepLoopOptions) { this.step = options.fixedStepSeconds ?? 1 / 30; this.maxDelta = options.maxDeltaSeconds ?? .1; this.update = options.update; this.render = options.render; }
  start(): void { if (this.frameId !== null) return; this.previousMs = performance.now(); this.frameId = requestAnimationFrame(this.tick); }
  stop(): void { if (this.frameId !== null) cancelAnimationFrame(this.frameId); this.frameId = null; this.accumulator = 0; }
  private readonly tick = (nowMs: number): void => { const delta = Math.min((nowMs - this.previousMs) / 1000, this.maxDelta); this.previousMs = nowMs; this.accumulator += delta; while (this.accumulator >= this.step) { this.simulationSeconds += this.step; this.update(this.step, this.simulationSeconds); this.accumulator -= this.step; } this.render(this.accumulator / this.step); this.frameId = requestAnimationFrame(this.tick); };
}
