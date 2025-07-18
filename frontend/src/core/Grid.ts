// Grid.ts
// Represents the game board and provides utilities for orthogonal movement and pathfinding

import type { MapGrid, Position } from './MapGrid';

export interface Position {
  x: number;
  y: number;
}

export class Grid {
  width: number;
  height: number;

  constructor(width = 10, height = 10) {
    this.width = width;
    this.height = height;
  }

  /**
   * Returns the reachable cells from a position with a given movement points (orthogonal movement, cost 1),
   * solo celdas walkable y no ocupadas
   */
  getReachableCells(from: Position, pm: number, map: MapGrid): Position[] {
    const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    const reachable: Position[] = [];
    const queue: { pos: Position; cost: number }[] = [{ pos: from, cost: 0 }];
    visited[from.y][from.x] = true;

    while (queue.length > 0) {
      const { pos, cost } = queue.shift()!;
      if (cost > 0) reachable.push(pos);
      if (cost === pm) continue;
      for (const [dx, dy] of [
        [0, -1], [0, 1], [-1, 0], [1, 0],
      ]) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        const npos = { x: nx, y: ny };
        if (
          nx >= 0 && nx < this.width &&
          ny >= 0 && ny < this.height &&
          !visited[ny][nx] &&
          map.isWalkable(npos) &&
          !map.isOccupied(npos)
        ) {
          visited[ny][nx] = true;
          queue.push({ pos: npos, cost: cost + 1 });
        }
      }
    }
    return reachable;
  }

  /**
   * Finds the shortest path (BFS) between two positions, only orthogonal, no obstacles ni ocupados
   */
  findPath(from: Position, to: Position, maxCost: number, map: MapGrid): Position[] | null {
    if (from.x === to.x && from.y === to.y) return [];
    const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    const queue: { pos: Position; path: Position[]; cost: number }[] = [
      { pos: from, path: [], cost: 0 },
    ];
    visited[from.y][from.x] = true;

    while (queue.length > 0) {
      const { pos, path, cost } = queue.shift()!;
      if (cost === maxCost) continue;
      for (const [dx, dy] of [
        [0, -1], [0, 1], [-1, 0], [1, 0],
      ]) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        const npos = { x: nx, y: ny };
        if (nx === to.x && ny === to.y && map.isWalkable(npos) && !map.isOccupied(npos)) {
          return [...path, pos, npos].slice(1);
        }
        if (
          nx >= 0 && nx < this.width &&
          ny >= 0 && ny < this.height &&
          !visited[ny][nx] &&
          map.isWalkable(npos) &&
          !map.isOccupied(npos)
        ) {
          visited[ny][nx] = true;
          queue.push({ pos: npos, path: [...path, pos], cost: cost + 1 });
        }
      }
    }
    return null;
  }
} 