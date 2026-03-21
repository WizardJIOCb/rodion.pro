// Global input counter using uiohook-napi
// Ported from activity-agent/src/inputCounter.ts
import { uIOhook } from 'uiohook-napi';
import type { InputCounts } from '../../shared/types';

export class InputCounter {
  private keys = 0;
  private clicks = 0;
  private scroll = 0;
  private started = false;

  start(): void {
    if (this.started) return;
    uIOhook.on('keydown', () => { this.keys++; });
    uIOhook.on('mousedown', () => { this.clicks++; });
    uIOhook.on('wheel', () => { this.scroll++; });
    uIOhook.start();
    this.started = true;
  }

  stop(): void {
    try { uIOhook.stop(); } catch { /* ignore */ }
    this.started = false;
  }

  consumeDelta(): InputCounts {
    const delta = { keys: this.keys, clicks: this.clicks, scroll: this.scroll };
    this.keys = 0;
    this.clicks = 0;
    this.scroll = 0;
    return delta;
  }
}
