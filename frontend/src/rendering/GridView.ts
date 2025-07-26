// GridView.ts
// Renders the board, highlights reachable cells, and displays the movement path

import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Position } from '@core/Grid';

export interface GridViewOptions {
  cellSize: number;
  width: number;
  height: number;
}

export class GridView extends Container {
  private options: GridViewOptions;
  private gridLayer: Graphics;
  private highlightLayer: Container;
  private pathContainer: Container;
  private hitAreaGraphics: Graphics;

  constructor(options: GridViewOptions) {
    super();
    this.options = options;

    this.gridLayer = new Graphics();
    this.highlightLayer = new Container();
    this.pathContainer = new Container();
    this.hitAreaGraphics = this.createHitArea();

    this.drawGrid();

    this.addChild(this.hitAreaGraphics); // always behind
    this.addChild(this.gridLayer);
    this.addChild(this.highlightLayer);
    this.addChild(this.pathContainer);

    this.eventMode = 'static';
  }

  /** Creates a transparent hit area to capture pointer events */
  private createHitArea(): Graphics {
    const { width, height, cellSize } = this.options;
    const hit = new Graphics();
    hit.fill({ color: 0xffffff, alpha: 0 });
    hit.rect(0, 0, width * cellSize, height * cellSize);
    hit.hitArea = new Rectangle(0, 0, width * cellSize, height * cellSize);
    hit.interactive = true;
    hit.eventMode = 'static';
    hit.cursor = 'pointer';
    return hit;
  }

  /** Draws the grid lines based on configured dimensions */
  private drawGrid(): void {
    const { width, height, cellSize } = this.options;
    this.gridLayer.clear();
    this.gridLayer.setStrokeStyle({ width: 1, color: 0x888888, alpha: 0.5 });
    for (let y = 0; y <= height; y++) {
      this.gridLayer.moveTo(0, y * cellSize);
      this.gridLayer.lineTo(width * cellSize, y * cellSize);
    }
    for (let x = 0; x <= width; x++) {
      this.gridLayer.moveTo(x * cellSize, 0);
      this.gridLayer.lineTo(x * cellSize, height * cellSize);
    }
  }

  /** Highlights all reachable cells in blue */
  public showReachableCells(cells: Position[]): void {
    this.highlightLayer.removeChildren();
    for (const cell of cells) {
      const sprite = new Sprite(Texture.WHITE);
      sprite.tint = 0x3399ff;
      sprite.alpha = 0.4;
      sprite.width = this.options.cellSize;
      sprite.height = this.options.cellSize;
      sprite.x = cell.x * this.options.cellSize;
      sprite.y = cell.y * this.options.cellSize;
      this.highlightLayer.addChild(sprite);
    }
  }

  /** Displays the movement path, including the final cell */
  public showPath(path: Position[]): void {
    // Clear previous path
    this.pathContainer.removeChildren();
    if (!path || path.length === 0) return;

    const { cellSize } = this.options;

    // Draw each path cell as a tinted sprite
    path.forEach((cell, idx) => {
      const isLast = idx === path.length - 1;
      const sprite = new Sprite(Texture.WHITE);
      sprite.tint = isLast ? 0x99ff99 : 0x33ff66;
      sprite.alpha = 0.5;
      sprite.width = cellSize;
      sprite.height = cellSize;
      sprite.x = cell.x * cellSize;
      sprite.y = cell.y * cellSize;
      this.pathContainer.addChild(sprite);
    });

    // Draw connecting line on top
    if (path.length > 1) {
      const lineG = new Graphics();
      lineG.setStrokeStyle({ width: 4, color: 0x33ff66, alpha: 0.8 });
      const getCenter = (c: Position): [number, number] => [
        c.x * cellSize + cellSize / 2,
        c.y * cellSize + cellSize / 2,
      ];
      const [startX, startY] = getCenter(path[0]);
      lineG.moveTo(startX, startY);
      for (let i = 1; i < path.length; i++) {
        const [x, y] = getCenter(path[i]);
        lineG.lineTo(x, y);
      }
      this.pathContainer.addChild(lineG);
    }
  }

  /** Clears both highlights and path drawing */
  public clearHighlights(): void {
    this.highlightLayer.removeChildren();
    this.pathContainer.removeChildren();
  }

  /** Converts pixel coordinates into grid cell coordinates */
  public getCellAtPixel(x: number, y: number): Position | null {
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
