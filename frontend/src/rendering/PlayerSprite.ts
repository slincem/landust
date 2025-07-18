// PlayerSprite.ts
// Renders the player visually and animates it cell by cell when moving
import { Container, Sprite, Texture } from 'pixi.js';
import type { Position } from '@core/Grid';

export interface PlayerSpriteOptions {
  cellSize: number;
  texture?: Texture;
}

export class PlayerSprite extends Container {
  private sprite: Sprite;
  private cellSize: number;

  constructor(options: PlayerSpriteOptions) {
    super();
    this.cellSize = options.cellSize;
    this.sprite = new Sprite(options.texture ?? Texture.WHITE);
    this.sprite.width = this.cellSize * 0.8;
    this.sprite.height = this.cellSize * 0.8;
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
  }

  /** Positions the sprite in the given cell */
  setCell(pos: Position) {
    this.x = pos.x * this.cellSize + this.cellSize / 2;
    this.y = pos.y * this.cellSize + this.cellSize / 2;
  }

  /** Animates the movement step by step along the path */
  async animatePath(path: Position[], speed = 120): Promise<void> {
    for (const pos of path) {
      await this.moveToCell(pos, speed);
    }
  }

  /** Moves the sprite smoothly to a cell */
  private moveToCell(pos: Position, speed: number): Promise<void> {
    return new Promise((resolve) => {
      const targetX = pos.x * this.cellSize + this.cellSize / 2;
      const targetY = pos.y * this.cellSize + this.cellSize / 2;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy)) / 8;
      let t = 0;
      const animate = () => {
        t++;
        this.x += dx / steps;
        this.y += dy / steps;
        if (t < steps) {
          requestAnimationFrame(animate);
        } else {
          this.x = targetX;
          this.y = targetY;
          resolve();
        }
      };
      animate();
    });
  }
} 