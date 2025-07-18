// MapGrid.ts
import type { Unit } from './Unit';

export interface Position {
  x: number;
  y: number;
}

export class MapCell {
  walkable: boolean = true;
  occupiedBy: Unit | null = null;
}

export class MapGrid {
  width: number;
  height: number;
  cells: MapCell[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => new MapCell())
    );
  }

  isWalkable(pos: Position): boolean {
    return this.inBounds(pos) && this.cells[pos.y][pos.x].walkable;
  }

  isOccupied(pos: Position): boolean {
    return this.inBounds(pos) && this.cells[pos.y][pos.x].occupiedBy !== null;
  }

  getOccupant(pos: Position): Unit | null {
    return this.inBounds(pos) ? this.cells[pos.y][pos.x].occupiedBy : null;
  }

  setOccupied(pos: Position, unit: Unit | null) {
    if (this.inBounds(pos)) {
      this.cells[pos.y][pos.x].occupiedBy = unit;
    }
  }

  inBounds(pos: Position): boolean {
    return (
      pos.x >= 0 && pos.x < this.width &&
      pos.y >= 0 && pos.y < this.height
    );
  }
} 