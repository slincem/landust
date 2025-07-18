// BattleScene.ts
// Orchestrates the battle scene: grid, player, interaction, and rendering
import { Grid, Position } from '@core/Grid';
import { Unit } from '@core/Unit';
import { UnitClasses } from '@core/unitClasses';
import { TurnManager } from '@core/TurnManager';
import { GridView } from '@rendering/GridView';
import { Container, Graphics, Text, TextStyle, Sprite, Texture, SCALE_MODES } from 'pixi.js';
import { UIManager } from '@ui/UIManager';
import { MapGrid } from '@core/MapGrid';

export class BattleScene extends Container {
  private grid: Grid;
  private units: Unit[];
  private unitSprites: Map<string, Container> = new Map();
  private gridView: GridView;
  private turnManager: TurnManager;
  private reachable: Position[] = [];
  private currentPath: Position[] = [];
  private isMoving: boolean = false;
  private basePM: number = 4;
  private gameContainer: Container;
  private backgroundLayer: Container | undefined;
  private gridLayer: Container;
  private unitLayer: Container;
  private ui: UIManager;
  private map: MapGrid;
  private damageTexts: Array<{ sprite: Container, timeout: number }> = [];
  private spellRangeLayer: Graphics = new Graphics();
  private unitBars: Map<string, Graphics> = new Map();
  private moveRangeLayer: Graphics = new Graphics();
  private spellBar: Container = new Container();
  private spellButtons: Graphics[] = [];
  private spellBarY: number = 0;

  constructor() {
    super();
    const cellSize = 64;
    const gridSize = cellSize * 10;
    // Solid background (covers the entire canvas, not just the grid)
    const bg = new Graphics();
    bg.beginFill(0x2c2f36);
    bg.drawRect(0, 0, 720, 880); // Background covers the entire canvas
    bg.endFill();
    this.addChild(bg); // Background is a direct child of the scene
    // Creates the main game container and layers
    this.gameContainer = new Container();
    this.gridLayer = new Container();
    this.unitLayer = new Container();
    this.gameContainer.addChild(this.gridLayer);
    this.gameContainer.addChild(this.unitLayer);
    this.addChild(this.spellBar);
    window.addEventListener('resize', () => this.positionSpellBar());
    // Grid layer (only 640x640)
    this.gridView = new GridView({ cellSize, width: 10, height: 10 });
    this.gridView.x = 0;
    this.gridView.y = 0;
    this.gridLayer.addChild(this.gridView);
    this.gridLayer.addChild(this.spellRangeLayer);
    this.gridLayer.addChild(this.moveRangeLayer);
    // Centers the gameContainer at the top
    this.centerGameContainer();
    this.addChild(this.gameContainer);
    // Game logic
    this.grid = new Grid(10, 10);
    this.map = new MapGrid(10, 10);
    this.units = [
      new Unit('p1', 'Player 1', 'player', { x: 0, y: 0 }, 0, UnitClasses.Warrem),
      new Unit('p2', 'Player 2', 'player', { x: 9, y: 9 }, 0, UnitClasses.Golarc),
    ];
    // Occupies initial positions
    for (const unit of this.units) {
      this.map.setOccupied(unit.position, unit);
    }
    this.turnManager = new TurnManager(this.units);
    this.gridView = new GridView({ cellSize, width: 10, height: 10 });
    this.gridView.x = 0;
    this.gridView.y = 0;
    this.gridLayer.addChild(this.gridView);
    this.gridLayer.addChild(this.spellRangeLayer);
    this.gridLayer.addChild(this.moveRangeLayer);
    // Renders unit sprites
    this.createUnitSprites();
    // External UI
    this.ui = new UIManager();
    this.updateTurnLabel();
    this.updateReachableAndHighlights();
    this.setupInteraction();
    this.ui.onEndTurnClick(() => this.endTurn());
    this.updateEndTurnButton();
    this.createSpellBar();
    this.positionSpellBar(); // <-- Calls here, after turnManager
  }

  // PixiJS calls this method when the container is added to the stage and the renderer already exists
  added() {
    this.centerGameContainer();
    // Listen for resize from the renderer
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.on('resize', () => this.centerGameContainer());
    }
  }

  /** Searches for the PixiJS renderer going up the parent hierarchy */
  private getRenderer() {
    let parent = this.parent;
    while (parent && !(parent as any).renderer) {
      parent = (parent as any).parent;
    }
    return parent ? (parent as any).renderer : null;
  }

  /** Centers the gameContainer at the top of the canvas, leaving space for the spell bar */
  private centerGameContainer() {
    const gridSize = 64 * 10;
    const renderer = this.getRenderer();
    let screenWidth = 720, screenHeight = 880;
    if (renderer && renderer.screen) {
      screenWidth = renderer.screen.width;
      screenHeight = renderer.screen.height;
    }
    this.gameContainer.x = (screenWidth - gridSize) / 2;
    // Grid ALWAYS at the top, with visual margin
    this.gameContainer.y = 32;
    // Adjusts the size of gridLayer and backgroundLayer to only occupy 640x640
    this.gridLayer.width = gridSize;
    this.gridLayer.height = gridSize;
    // The background already covers the entire canvas, no need to adjust its size
  }

  /** Creates unit sprites and adds them to the unitLayer */
  private createUnitSprites() {
    this.unitLayer.removeChildren();
    this.unitSprites.clear();
    this.unitBars.clear();
    for (const unit of this.units) {
      // Uses custom PNG sprites for each player
      const spritePath = unit.id === 'p1'
        ? 'player1'
        : 'player2';
      const sprite = new Sprite(Texture.from(spritePath));
      sprite.anchor.set(0.5);
      sprite.width = 48;
      sprite.height = 48;
      // Centers the sprite in the cell
      sprite.x = unit.position.x * 64 + 32;
      sprite.y = unit.position.y * 64 + 32;
      sprite.eventMode = 'none';
      this.unitSprites.set(unit.id, sprite as unknown as Container);
      this.unitLayer.addChild(sprite);
      // HP and AP bars
      const bar = new Graphics();
      this.unitBars.set(unit.id, bar);
      this.unitLayer.addChild(bar);
    }
    this.updateUnitSprites();
  }

  /** Updates the position, outline, and bars of units */
  private updateUnitSprites() {
    const activeId = this.turnManager.getCurrentUnit().id;
    for (const unit of this.units) {
      const sprite = this.unitSprites.get(unit.id)!;
      sprite.x = unit.position.x * 64 + 32;
      sprite.y = unit.position.y * 64 + 32;
      // Optional: highlights the active unit
      sprite.alpha = unit.id === activeId ? 1 : 0.7;
      sprite.tint = unit.id === activeId ? 0xffffff : 0xcccccc;
      // HP and AP bars
      const bar = this.unitBars.get(unit.id);
      if (bar) {
        bar.clear();
        // Dark gray background
        const barWidth = 44;
        const barHeight = 6;
        const barX = sprite.x - barWidth / 2;
        let barY = sprite.y - 38;
        // HP (green)
        bar.beginFill(0x222222);
        bar.drawRect(barX, barY, barWidth, barHeight);
        bar.endFill();
        bar.beginFill(0x3ecf4a);
        bar.drawRect(barX, barY, barWidth * (unit.hp / unit.maxHP), barHeight);
        bar.endFill();
        // AP (blue), right above
        barY -= (barHeight + 2);
        bar.beginFill(0x222222);
        bar.drawRect(barX, barY, barWidth, barHeight);
        bar.endFill();
        bar.beginFill(0x3a8fff);
        bar.drawRect(barX, barY, barWidth * (unit.ap / unit.maxAP), barHeight);
        bar.endFill();
      }
    }
  }

  /** Updates the turn label in the UI (includes AP) */
  private updateTurnLabel() {
    const unit = this.turnManager.getCurrentUnit();
    this.ui.setTurnText(`Turn of: ${unit.name}  |  AP: ${unit.ap}`);
  }

  /** Calculates and displays reachable cells and cleans up paths */
  private updateReachableAndHighlights() {
    const unit = this.turnManager.getCurrentUnit();
    this.reachable = this.grid.getReachableCells(unit.position, unit.mp, this.map);
    this.gridView.showReachableCells(this.reachable);
    this.gridView.showPath([]);
  }

  /** Shows or hides the button based on the active unit's PM state */
  private updateEndTurnButton() {
    // The button must be always visible during the turn
    this.ui.setEndTurnButtonVisible(true);
  }

  /** Positions the spell bar within the canvas, centered and with a bottom margin */
  private positionSpellBar() {
    // Attempts to get the actual size of the renderer/canvas
    let canvasHeight = 880;
    let canvasWidth = 720;
    let renderer = this.getRenderer();
    if (renderer && renderer.screen) {
      canvasHeight = renderer.screen.height;
      canvasWidth = renderer.screen.width;
    }
    const barHeight = 48;
    // Spell bar ALWAYS at the bottom, never overlaps the grid
    this.spellBarY = canvasHeight - barHeight - 24;
    this.spellBar.y = this.spellBarY;
    this.spellBar.x = 0;
    this.createSpellBar(canvasWidth, barHeight);
  }

  /** Creates the spell bar at the bottom of the canvas */
  private createSpellBar(canvasWidth: number = 720, barHeight: number = 48) {
    this.spellBar.removeChildren();
    this.spellButtons = [];
    const unit = this.turnManager.getCurrentUnit();
    const spells = unit.spells;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const spacing = 24;
    const totalWidth = spells.length * buttonWidth + (spells.length - 1) * spacing;
    const y = 0; // Already positioned by this.spellBar.y
    // Spell bar background
    const barBg = new Graphics();
    barBg.beginFill(0x23242a, 0.95);
    barBg.drawRoundedRect((canvasWidth - totalWidth) / 2 - 24, y - 8, totalWidth + 48, barHeight + 16, 18);
    barBg.endFill();
    this.spellBar.addChild(barBg);
    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i];
      const btn = new Graphics();
      // Background
      btn.beginFill(i === unit.selectedSpellIdx ? 0x1976d2 : 0x333333);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      btn.endFill();
      // Border
      btn.lineStyle(3, i === unit.selectedSpellIdx ? 0xfff066 : 0x222222);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      // Text
      const label = new Text(spell.name, new TextStyle({ fontSize: 18, fill: i === unit.selectedSpellIdx ? '#fff' : '#bbb', fontWeight: 'bold' }));
      label.anchor.set(0.5);
      label.x = buttonWidth / 2;
      label.y = buttonHeight / 2;
      btn.addChild(label);
      btn.x = (canvasWidth - totalWidth) / 2 + i * (buttonWidth + spacing);
      btn.y = y;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerdown', () => {
        unit.selectedSpellIdx = i;
        this.createSpellBar(canvasWidth, barHeight);
        this.updateTurnLabel();
        // Force spell area recalculation
        this.gridView.emit('pointermove', { global: { x: 0, y: 0 } });
      });
      this.spellBar.addChild(btn);
      this.spellButtons.push(btn);
    }
  }

  /** Interaction logic: only the active unit can move or attack */
  private setupInteraction() {
    // Movement on the grid
    this.gridView.on('pointermove', (e: any) => {
      if (this.isMoving) return;
      this.clearEnemyHighlights();
      // Draws the spell range area (light red) only if a spell is selected
      this.spellRangeLayer.clear();
      const unit = this.turnManager.getCurrentUnit();
      if (unit.selectedSpell) {
        const range = unit.selectedSpell.range;
        for (let dx = -range; dx <= range; dx++) {
          for (let dy = -range; dy <= range; dy++) {
            const tx = unit.position.x + dx;
            const ty = unit.position.y + dy;
            if (tx === unit.position.x && ty === unit.position.y) continue;
            if (tx < 0 || tx >= 10 || ty < 0 || ty >= 10) continue;
            const cheb = Math.max(Math.abs(dx), Math.abs(dy));
            if (cheb <= range) {
              // No highlights on cells occupied by allies
              const occupant = this.map.getOccupant({ x: tx, y: ty });
              if (!occupant || occupant.type !== unit.type) {
                this.spellRangeLayer.beginFill(0xff4444, 0.18);
                this.spellRangeLayer.drawRect(tx * 64, ty * 64, 64, 64);
                this.spellRangeLayer.endFill();
              }
            }
          }
        }
      }
      // Draws the movement range (blue)
      this.moveRangeLayer.clear();
      if (unit.mp > 0) {
        const moveCells = this.grid.getReachableCells(unit.position, unit.mp, this.map);
        for (const cell of moveCells) {
          this.moveRangeLayer.beginFill(0x3a8fff, 0.18);
          this.moveRangeLayer.drawRect(cell.x * 64, cell.y * 64, 64, 64);
          this.moveRangeLayer.endFill();
        }
      }
      // Movement path and enemy highlights
      this.gridView.showPath([]);
      const localX = e.global.x - this.gameContainer.x;
      const localY = e.global.y - this.gameContainer.y;
      const mouseCell: Position | null = this.gridView.getCellAtPixel(localX, localY);
      if (mouseCell) {
        for (const other of this.units) {
          if (other !== unit && other.isAlive() && unit.canCastSpell(other)) {
            if (other.position.x === mouseCell.x && other.position.y === mouseCell.y) {
              const sprite = this.unitSprites.get(other.id);
              if (sprite) sprite.tint = 0xff4444;
            }
          }
        }
        // Path and highlights only if the cell is valid for movement
        if (this.isCellReachable(mouseCell, unit)) {
          const path = this.grid.findPath(unit.position, mouseCell, unit.mp, this.map);
          if (path && path.length > 0 && path.length <= unit.mp) {
            this.currentPath = path;
            this.gridView.showPath(path);
          } else {
            this.gridView.showPath([]);
          }
        } else {
          this.gridView.showPath([]);
        }
      } else {
        this.gridView.showPath([]);
      }
    });
    // Clears spell range and highlights when leaving the grid
    this.gridView.on('pointerout', () => {
      this.spellRangeLayer.clear();
      this.moveRangeLayer.clear();
      this.clearEnemyHighlights();
      this.gridView.showPath([]);
    });
    // Click on the grid (movement)
    this.gridView.on('pointerdown', async (e: any) => {
      if (this.isMoving) return;
      const unit = this.turnManager.getCurrentUnit();
      const localX = e.global.x - this.gameContainer.x;
      const localY = e.global.y - this.gameContainer.y;
      const pos = this.gridView.getCellAtPixel(localX, localY);
      if (pos && this.isCellReachable(pos, unit)) {
        const path = this.grid.findPath(unit.position, pos, unit.mp, this.map);
        if (path && path.length > 0 && path.length <= unit.mp) {
          this.isMoving = true;
          // Releases the current cell before moving
          this.map.setOccupied(unit.position, null);
          let prevPos = unit.position;
          await unit.moveTo(path, async (stepPos) => {
            // Releases the previous cell and occupies the new one
            this.map.setOccupied(prevPos, null);
            this.map.setOccupied(stepPos, unit);
            prevPos = stepPos;
            this.updateUnitSprites();
            await new Promise(res => setTimeout(res, 200));
          });
          this.updateUnitSprites();
          this.updateReachableAndHighlights();
          this.isMoving = false;
          this.updateEndTurnButton();
        }
      }
    });
    // Click on enemy sprites (spell)
    this.setupSpellListeners();
    this.positionSpellBar();
  }

  /** Checks if a cell is reachable for the active unit */
  private isCellReachable(pos: Position, unit: Unit): boolean {
    return this.reachable.some(c => c.x === pos.x && c.y === pos.y);
  }

  /** Clears enemy highlights */
  private clearEnemyHighlights() {
    for (const other of this.units) {
      const sprite = this.unitSprites.get(other.id);
      if (sprite) {
        sprite.tint = other.id === this.turnManager.getCurrentUnit().id ? 0xffffff : 0xcccccc;
      }
    }
  }

  /** Shows a floating damage text over the target */
  private showDamageText(target: Unit, text: string) {
    const sprite = this.unitSprites.get(target.id);
    if (!sprite) return;
    const dmgText = new Text(text, { fontSize: 24, fill: '#ff4444', fontWeight: 'bold', stroke: '#fff' });
    dmgText.anchor.set(0.5);
    dmgText.x = sprite.x;
    dmgText.y = sprite.y - 32;
    this.unitLayer.addChild(dmgText);
    const timeout = window.setTimeout(() => {
      this.unitLayer.removeChild(dmgText);
    }, 700);
    this.damageTexts.push({ sprite: dmgText, timeout });
  }

  /** Ends the current turn and passes to the next */
  private endTurn() {
    this.turnManager.endTurn();
    this.updateTurnLabel();
    this.updateReachableAndHighlights();
    this.updateUnitSprites();
    this.updateEndTurnButton();
    this.clearEnemyHighlights();
    this.spellRangeLayer.clear();
    this.moveRangeLayer.clear();
    this.setupSpellListeners();
    this.positionSpellBar();
  }

  /** Configures spell listeners on enemy sprites (only for the active player) */
  private setupSpellListeners() {
    // Clears previous listeners
    for (const other of this.units) {
      const sprite = this.unitSprites.get(other.id);
      const bar = this.unitBars.get(other.id);
      if (sprite) {
        sprite.removeAllListeners && sprite.removeAllListeners('pointerdown');
        sprite.eventMode = 'none';
        sprite.cursor = '';
      }
      if (bar) {
        bar.removeAllListeners && bar.removeAllListeners();
      }
    }
    // Only the active player can attack
    const caster = this.turnManager.getCurrentUnit();
    for (const other of this.units) {
      if (other === caster) continue;
      const sprite = this.unitSprites.get(other.id);
      if (!sprite) continue;
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointerdown', () => {
        // Only allows attacking if a spell is selected
        if (caster.selectedSpellIdx === -1) return;
        // Only allows attacking if the mouse is over the logical target cell
        const mouseCell = { x: other.position.x, y: other.position.y };
        if (!caster.canCastSpell(other)) return;
        if (caster.castSpell(other)) {
          this.showDamageText(other, `-${caster.selectedSpell ? caster.selectedSpell.damage : ''}`);
          this.updateTurnLabel();
          this.updateUnitSprites(); // Updates bars after damage
          if (!other.isAlive()) {
            this.unitLayer.removeChild(sprite);
            const bar = this.unitBars.get(other.id);
            if (bar) this.unitLayer.removeChild(bar);
            this.map.setOccupied(other.position, null);
            this.units = this.units.filter(u => u !== other);
            this.setupSpellListeners();
          } else {
            this.setupSpellListeners();
          }
        }
      });
    }
  }
} 