// GridView.ts
// Renders the board and highlights reachable cells and the selected path
import { Container, Graphics } from 'pixi.js';
import type { Position } from '@core/Grid';

export interface GridViewOptions {
  cellSize: number;
  width: number;
  height: number;
}

export class GridView extends Container {
  options: GridViewOptions;
  private gridLayer: Graphics;
  private highlightLayer: Graphics;
  private pathLayer: Graphics;

  constructor(options: GridViewOptions) {
    super();
    this.options = options;
    this.gridLayer = new Graphics();
    this.highlightLayer = new Graphics();
    this.pathLayer = new Graphics();
    this.drawGrid();
    // Capa interactiva invisible para recibir eventos en todo el grid
    const hitArea = new Graphics();
    hitArea.beginFill(0xffffff, 0);
    hitArea.drawRect(0, 0, options.width * options.cellSize, options.height * options.cellSize);
    hitArea.endFill();
    hitArea.eventMode = 'static';
    hitArea.cursor = 'pointer';
    this.addChild(hitArea);
    this.addChild(this.gridLayer);
    this.addChild(this.highlightLayer);
    this.addChild(this.pathLayer);
    this.eventMode = 'static'; // Asegura que el grid reciba eventos
    // El hitArea invisible debe estar detrás de todo
    this.setChildIndex(hitArea, 0);
    // Opcional: puedes asignar this.hitArea = ... para legacy Pixi
    console.log('GridView creado en (0,0), tamaño:', this.options.width * this.options.cellSize, this.options.height * this.options.cellSize);
  }

  /** Draws the base grid lines */
  private drawGrid() {
    const { width, height, cellSize } = this.options;
    this.gridLayer.clear();
    this.gridLayer.lineStyle(1, 0x888888, 0.5);
    for (let y = 0; y <= height; y++) {
      this.gridLayer.moveTo(0, y * cellSize);
      this.gridLayer.lineTo(width * cellSize, y * cellSize);
    }
    for (let x = 0; x <= width; x++) {
      this.gridLayer.moveTo(x * cellSize, 0);
      this.gridLayer.lineTo(x * cellSize, height * cellSize);
    }
  }

  /** Highlights reachable cells in blue */
  showReachableCells(cells: Position[]) {
    this.highlightLayer.clear();
    for (const cell of cells) {
      this.highlightLayer.beginFill(0x3399ff, 0.3);
      this.highlightLayer.drawRect(
        cell.x * this.options.cellSize,
        cell.y * this.options.cellSize,
        this.options.cellSize,
        this.options.cellSize
      );
      this.highlightLayer.endFill();
    }
  }

  /** Draws the selected path in green (cells + line) */
  showPath(path: Position[]) {
    this.pathLayer.clear();
    if (!path || path.length === 0) return;
    // Dibuja celdas
    for (const cell of path) {
      this.pathLayer.beginFill(0x33ff66, 0.5);
      this.pathLayer.drawRect(
        cell.x * this.options.cellSize,
        cell.y * this.options.cellSize,
        this.options.cellSize,
        this.options.cellSize
      );
      this.pathLayer.endFill();
    }
    // Dibuja línea sobre el centro de cada celda del camino
    if (path.length > 1) {
      this.pathLayer.lineStyle(4, 0x33ff66, 0.8);
      const getCenter = (cell: Position) => [
        cell.x * this.options.cellSize + this.options.cellSize / 2,
        cell.y * this.options.cellSize + this.options.cellSize / 2
      ];
      const [startX, startY] = getCenter(path[0]);
      this.pathLayer.moveTo(startX, startY);
      for (let i = 1; i < path.length; i++) {
        const [x, y] = getCenter(path[i]);
        this.pathLayer.lineTo(x, y);
      }
    }
  }

  /** Clears highlights and path overlays */
  clearHighlights() {
    this.highlightLayer.clear();
    this.pathLayer.clear();
  }

  /** Returns the cell (x, y) under a pixel point, or null if out of bounds */
  getCellAtPixel(x: number, y: number): Position | null {
    const cx = Math.floor(x / this.options.cellSize);
    const cy = Math.floor(y / this.options.cellSize);
    if (
      cx >= 0 && cx < this.options.width &&
      cy >= 0 && cy < this.options.height
    ) {
      return { x: cx, y: cy };
    }
    return null;
  }
} 