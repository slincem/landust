// BattleScene.ts
// Orchestrates the battle scene: delegates logic to modular systems for maintainability and extensibility.

import { Grid, Position } from '@core/Grid';
import { Unit } from '@core/Unit';
import { UnitClasses } from '@core/unitClasses';
import { TurnManager } from '@core/TurnManager';
import { GridView } from '@rendering/GridView';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { UIManager } from '@ui/UIManager';
import { MapGrid } from '@core/MapGrid';
import { Spell } from '@core/Spell';
import { BattleVisuals } from './BattleVisuals';
import { BattleLogic } from '@core/battle/BattleLogic';
import { SpellSystem } from '@core/battle/SpellSystem';
import { MovementSystem } from '@core/battle/MovementSystem';
import { BattleUI } from '@core/battle/BattleUI';

// --- Configurable constants ---
const GRID_SIZE = 10;
const CELL_SIZE = 64;
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 880;

export class BattleScene extends Container {
  // Core systems
  public battleLogic: BattleLogic;
  public spellSystem: SpellSystem;
  public movementSystem: MovementSystem;
  public battleUI: BattleUI;

  // Game state
  public grid: Grid;
  public units: Unit[];
  public unitSprites: Map<string, Sprite> = new Map();
  public gridView: GridView;
  public turnManager: TurnManager;
  public map: MapGrid;
  public unitBars: Map<string, Container> = new Map();

  // Visual layers
  public gameContainer: Container;
  public gridLayer: Container;
  public unitLayer: Container;
  public spellRangeLayer: Graphics = new Graphics();
  public moveRangeLayer: Graphics = new Graphics();
  public spellBar: Container = new Container();

  // UI
  public ui: UIManager;
  public spellButtons: Graphics[] = [];
  public spellBarY: number = 0;

  // State
  public reachable: Position[] = [];
  public currentPath: Position[] = [];
  public isMoving: boolean = false;

  constructor() {
    super();
    // --- Visual setup ---
    const bg = new Graphics();
    bg.fill({ color: 0x2c2f36 });
    bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.addChild(bg);

    this.gameContainer = new Container();
    this.gridLayer = new Container();
    this.unitLayer = new Container();
    this.gameContainer.addChild(this.gridLayer);
    this.gameContainer.addChild(this.unitLayer);
    this.addChild(this.spellBar);

    // Grid and map
    this.gridView = new GridView({ cellSize: CELL_SIZE, width: GRID_SIZE, height: GRID_SIZE });
    this.gridLayer.addChild(this.gridView);
    this.gridLayer.addChild(this.spellRangeLayer);
    this.gridLayer.addChild(this.moveRangeLayer);
    this.centerGameContainer();
    this.addChild(this.gameContainer);

    this.grid = new Grid(GRID_SIZE, GRID_SIZE);
    this.map = new MapGrid(GRID_SIZE, GRID_SIZE);

    // --- Game logic setup ---
    const classNames = Object.keys(UnitClasses);
    const idx1 = Math.floor(Math.random() * classNames.length);
    let idx2 = Math.floor(Math.random() * classNames.length);
    if (idx2 === idx1) idx2 = (idx2 + 1) % classNames.length;
    const class1 = UnitClasses[classNames[idx1]];
    const class2 = UnitClasses[classNames[idx2]];
    this.units = [
      new Unit('p1', `Player 1 (${class1.name})`, 'player', { x: 0, y: 0 }, 1, class1),
      new Unit('p2', `Player 2 (${class2.name})`, 'player', { x: 9, y: 9 }, 2, class2),
    ];
    for (const unit of this.units) {
      this.map.setOccupied(unit.position, unit);
    }
    this.turnManager = new TurnManager(this.units);

    // --- System instantiation ---
    this.battleLogic = new BattleLogic(this, this.turnManager, this.map);
    this.spellSystem = new SpellSystem(this, this.map);
    this.movementSystem = new MovementSystem(this, this.grid, this.map);
    this.ui = new UIManager();
    this.battleUI = new BattleUI(this, this.ui);

    // --- Visuals and UI ---
    this.createUnitSprites();
    this.battleUI.updateUnitSprites();
    this.battleUI.updateTurnLabel();
    this.setupInteraction();
    this.spellSystem.setupSpellListeners();
    this.battleUI.createSpellBar();
    this.battleUI.positionSpellBar();

    // Ensure turn starts correctly after setup
    this.battleLogic.startTurn();

    window.addEventListener('resize', () => this.battleUI.positionSpellBar());

    // Ensure End Turn button calls battleLogic.endTurn()
    this.ui.onEndTurnClick(() => this.battleLogic.endTurn());
  }

  // --- Orchestration methods (delegating to systems) ---

  public handleSpellCast(target: Unit | null, cellPosition?: Position) {
    return this.spellSystem.handleSpellCast(target, cellPosition);
  }

  public handleUnitDeath(unit: Unit) {
    this.battleLogic.handleUnitDeath(unit);
  }

  public removeUnitVisuals(unit: Unit) {
    // ... (same as before, but public)
    const sprite = this.unitSprites.get(unit.id);
    if (sprite) {
      this.unitLayer.removeChild(sprite);
      this.unitSprites.delete(unit.id);
    }
    const bar = this.unitBars.get(unit.id);
    if (bar) {
      this.unitLayer.removeChild(bar);
      this.unitBars.delete(unit.id);
    }
  }

  public updateUnitSprites() {
    this.battleUI.updateUnitSprites();
  }

  public updateTurnLabel() {
    this.battleUI.updateTurnLabel();
  }

  public setupSpellListeners() {
    this.spellSystem.setupSpellListeners();
  }

  public createSpellBar() {
    this.battleUI.createSpellBar();
  }

  public positionSpellBar() {
    this.battleUI.positionSpellBar();
  }

  public updateReachableAndHighlights() {
    this.movementSystem.updateReachableAndHighlights();
  }

  public showDamageText(target: Unit, text: string) {
    this.battleUI.showDamageText(target, text);
  }

  // --- Visual/utility methods (unchanged, but now only orchestration) ---

  public createUnitSprites() {
    // ... (existing logic for creating sprites, but public)
    this.unitLayer.removeChildren();
    this.unitSprites.clear();
    this.unitBars.clear();
    for (const unit of this.units) {
      const spritePath = unit.id === 'p1' ? 'player1' : 'player2';
      const sprite = new Sprite(Texture.from(spritePath));
      sprite.anchor.set(0.5);
      sprite.width = 48;
      sprite.height = 48;
      sprite.x = unit.position.x * CELL_SIZE + CELL_SIZE / 2;
      sprite.y = unit.position.y * CELL_SIZE + CELL_SIZE / 2;
      sprite.eventMode = 'none';
      this.unitSprites.set(unit.id, sprite);
      this.unitLayer.addChild(sprite);
      // HP and AP bars
      const bar = new Container();
      this.unitBars.set(unit.id, bar);
      this.unitLayer.addChild(bar);
    }
  }

  public centerGameContainer() {
    const gridSize = CELL_SIZE * GRID_SIZE;
    let screenWidth = CANVAS_WIDTH, screenHeight = CANVAS_HEIGHT;
    const renderer = (this.parent as any)?.renderer || (this as any).renderer;
    if (renderer && renderer.screen) {
      screenWidth = renderer.screen.width;
      screenHeight = renderer.screen.height;
    }
    this.gameContainer.x = (screenWidth - gridSize) / 2;
    this.gameContainer.y = 32;
    this.gridLayer.width = gridSize;
    this.gridLayer.height = gridSize;
  }

  // --- Interaction setup (delegates to systems) ---

  public setupInteraction() {
    // Pointer events and movement/casting logic are now delegated to the systems
    this.movementSystem.setupInteraction();
  }
} 