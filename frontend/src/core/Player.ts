// Player.ts
// Represents the player, its position and movement points (MP)
import type { Position } from './Grid';

export class Player {
  position: Position;
  pm: number;

  constructor(position: Position, pm: number = 4) {
    this.position = position;
    this.pm = pm;
  }

  /**
   * Checks if the player can move to the target cell (by Manhattan distance)
   */
  canMoveTo(to: Position): boolean {
    const dist = Math.abs(this.position.x - to.x) + Math.abs(this.position.y - to.y);
    return dist <= this.pm;
  }

  /**
   * Moves the player along the given path, step by step, consuming PM.
   * Calls onStep(pos) en cada paso para animación visual.
   */
  async moveTo(path: Position[], onStep?: (pos: Position) => Promise<void>) {
    if (!path || path.length === 0) return;
    let steps = Math.min(path.length, this.pm);
    for (let i = 0; i < steps; i++) {
      this.position = path[i];
      this.pm--;
      if (onStep) {
        await onStep(this.position);
      }
    }
  }

  /**
   * Resta PM al jugador (no menor que 0)
   */
  consumePM(amount: number) {
    this.pm = Math.max(0, this.pm - amount);
  }

  /**
   * Reinicia los puntos de movimiento del jugador al valor base (por defecto 4)
   */
  startTurn(basePM: number = 4) {
    this.pm = basePM;
  }
} 