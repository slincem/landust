import { Container, Text, TextStyle } from 'pixi.js';

export interface FloatingTextOptions {
  color?: string | number;
  fontSize?: number;
  duration?: number; // ms
  yOffset?: number;
}

export class FloatingText extends Container {
  private textObj: Text;
  private startY: number;
  private endY: number;
  private duration: number;
  private elapsed: number = 0;

  constructor(text: string, x: number, y: number, options: FloatingTextOptions = {}) {
    super();
    const color = options.color ?? '#ff4444';
    const fontSize = options.fontSize ?? 24;
    this.duration = options.duration ?? 1200;
    const yOffset = options.yOffset ?? 0;
    this.startY = y + yOffset;
    this.endY = this.startY - 32;
    this.textObj = new Text(text, new TextStyle({
      fontSize,
      fill: color,
      fontWeight: 'bold',
      stroke: '#fff',
      align: 'center',
      dropShadow: true,
    }));
    this.textObj.anchor.set(0.5);
    this.textObj.x = x;
    this.textObj.y = this.startY;
    this.addChild(this.textObj);
    this.alpha = 1;
  }

  update(delta: number) {
    this.elapsed += delta;
    const t = Math.min(this.elapsed / this.duration, 1);
    // Movimiento hacia arriba
    this.textObj.y = this.startY + (this.endY - this.startY) * t;
    // Fade out
    this.alpha = 1 - t;
    if (t >= 1) {
      this.parent?.removeChild(this);
    }
  }

  static show(container: Container, text: string, x: number, y: number, color: string | number, options: Partial<FloatingTextOptions> = {}) {
    const ft = new FloatingText(text, x, y, { ...options, color });
    container.addChild(ft);
    // Animación: hook al ticker global de Pixi
    const ticker = (container as any).app?.ticker || (window as any).PIXI?.app?.ticker;
    if (ticker && typeof ticker.add === 'function') {
      const update = (delta: number) => {
        ft.update(delta * 16.67); // delta en ms aprox
        if (!ft.parent) ticker.remove(update);
      };
      ticker.add(update);
    } else {
      // Fallback: animación manual con setInterval
      let last = performance.now();
      const step = () => {
        const now = performance.now();
        ft.update(now - last);
        last = now;
        if (ft.parent) requestAnimationFrame(step);
      };
      step();
    }
    return ft;
  }
} 