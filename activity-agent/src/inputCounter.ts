import { uIOhook } from 'uiohook-napi';

export class InputCounter {
  private keys = 0;
  private clicks = 0;
  private scroll = 0;

  start() {
    uIOhook.on('keydown', () => { this.keys += 1; });
    uIOhook.on('mousedown', () => { this.clicks += 1; });
    uIOhook.on('wheel', () => { this.scroll += 1; });
    uIOhook.start();
  }

  stop() {
    try { uIOhook.stop(); } catch {}
  }

  consumeDelta() {
    const out = { keys: this.keys, clicks: this.clicks, scroll: this.scroll };
    this.keys = 0; this.clicks = 0; this.scroll = 0;
    return out;
  }
}