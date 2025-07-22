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
import { Spell } from '@core/Spell';
import type { EffectType } from '@core/EffectEngine';
import { BattleVisuals } from './BattleVisuals';

/**
 * Returns the tint color for a given effect type for target highlighting.
 * Easily extensible for new effect types.
 */
function getTargetTint(effectType: EffectType): number {
  switch (effectType) {
    case 'damage':
      return 0xff4444; // Red
    case 'heal':
      return 0x3ecf4a; // Green
    case 'buff_ap':
      return 0x3a8fff; // Light blue
    case 'drain_ap':
      return 0x6a5acd; // Purple
    case 'teleport':
      return 0xf1c40f; // Yellow
    // Add more cases for new effect types as needed
    default:
      return 0xffffff; // Default to white (no tint)
  }
}

export class BattleScene extends Container {
  private grid: Grid;
  private units: Unit[];
  private unitSprites: Map<string, Sprite> = new Map();
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
    // Random class selection for the two players
    const classNames = Object.keys(UnitClasses);
    const idx1 = Math.floor(Math.random() * classNames.length);
    let idx2 = Math.floor(Math.random() * classNames.length);
    // Evitar que ambos sean la misma clase
    if (idx2 === idx1) idx2 = (idx2 + 1) % classNames.length;
    const class1 = UnitClasses[classNames[idx1]];
    const class2 = UnitClasses[classNames[idx2]];
    this.units = [
      new Unit('p1', `Player 1 (${class1.name})`, 'player', { x: 0, y: 0 }, 1, class1),
      new Unit('p2', `Player 2 (${class2.name})`, 'player', { x: 9, y: 9 }, 2, class2),
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
      this.unitSprites.set(unit.id, sprite);
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

  /**
   * Returns true if the cell is in Manhattan range for the given spell.
   */
  private isCellInSpellRange(caster: Unit, spell: Spell, pos: Position): boolean {
    const dx = Math.abs(caster.position.x - pos.x);
    const dy = Math.abs(caster.position.y - pos.y);
    const dist = dx + dy;
    return dist <= spell.range && dist >= spell.minRange;
  }

  /**
   * Orchestrates the battle scene: grid, player, interaction, and rendering.
   * All targeting and spell logic is delegated to Spell and Unit.
   */
  private updateReachableAndHighlights() {
    const caster = this.turnManager.getCurrentUnit();
    const spell = caster.selectedSpell;
    this.spellRangeLayer.clear();
    this.moveRangeLayer.clear();
    this.reachable = [];
    if (spell && caster.ap >= spell.cost) {
      // First, show all cells in spell range (Manhattan distance)
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const pos = { x, y };
          if (!this.isCellInSpellRange(caster, spell, pos)) continue;
          // Show area of effect (all in range) with low alpha
          BattleVisuals.highlightTargetCell(this.spellRangeLayer, pos, 0x888888, 0.10);
        }
      }
      // Now, highlight valid targets with effect color
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const pos = { x, y };
          if (!this.isCellInSpellRange(caster, spell, pos)) continue;
          let isValid = false;
          let color = 0xff4444;
          let target = this.units.find(u => u.position.x === x && u.position.y === y) || null;
          // Handle empty cell targeting (teleport, etc.)
          if ((spell.targetType === 'empty' || spell.targetType === 'unitOrEmpty') && !target && spell.canCast(caster, null, { map: this.map, cellPosition: pos })) {
            isValid = true;
            color = BattleVisuals.getTargetTint(spell.effects[0]?.type);
          }
          // Handle unit targeting (including self-heal)
          if (target && spell.canCast(caster, target, { map: this.map, cellPosition: pos })) {
            isValid = true;
            const mainEffectType = spell.effects[0]?.type;
            color = BattleVisuals.getTargetTint(mainEffectType);
          }
          if (isValid) {
            this.reachable.push({ x, y });
            BattleVisuals.highlightTargetCell(this.spellRangeLayer, pos, color, 0.32);
          }
        }
      }
    } else {
      this.reachable = this.grid.getReachableCells(caster.position, caster.mp, this.map);
      for (const cell of this.reachable) {
        BattleVisuals.highlightTargetCell(this.moveRangeLayer, cell, 0x3a8fff, 0.18);
      }
    }
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
      const hasAP = unit.ap >= spell.cost;
      const casts = unit.castsThisTurn[spell.name] ?? 0;
      const isOnCooldown = spell.cooldownCounter && spell.cooldownCounter > 0;
      const maxCastsReached = spell.maxCastsPerTurn !== -1 && casts >= spell.maxCastsPerTurn;
      // Centralized validation: spell is enabled only if not on cooldown, not maxed, and has AP
      const isEnabled = hasAP && !isOnCooldown && !maxCastsReached;
      const isSelected = i === unit.selectedSpellIdx;
      const btn = new Graphics();
      // Background
      btn.beginFill(isSelected ? 0x1976d2 : isEnabled ? 0x333333 : 0x222222);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      btn.endFill();
      // Border
      btn.lineStyle(3, isSelected ? 0xfff066 : 0x222222);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      // Text
      let labelText = spell.name;
      if (isOnCooldown) labelText += ` (${spell.cooldownCounter})`;
      else if (spell.maxCastsPerTurn !== -1) labelText += ` (${casts}/${spell.maxCastsPerTurn})`;
      const label = new Text(labelText, new TextStyle({ fontSize: 18, fill: isSelected ? '#fff' : isEnabled ? '#bbb' : '#666', fontWeight: 'bold' }));
      label.anchor.set(0.5);
      label.x = buttonWidth / 2;
      label.y = buttonHeight / 2;
      btn.addChild(label);
      btn.x = (canvasWidth - totalWidth) / 2 + i * (buttonWidth + spacing);
      btn.y = y;
      btn.eventMode = isEnabled ? 'static' : 'none';
      btn.cursor = isEnabled ? 'pointer' : 'not-allowed';
      btn.on('pointerdown', () => {
        if (!isEnabled) return;
        // Toggle spell selection: deselect if already selected
        if (unit.selectedSpellIdx === i) {
          unit.selectedSpellIdx = -1;
        } else {
          unit.selectedSpellIdx = i;
        }
        this.createSpellBar(canvasWidth, barHeight);
        this.updateTurnLabel();
        // Force spell area recalculation
        this.gridView.emit('pointermove', { global: { x: 0, y: 0 } });
      });
      this.spellBar.addChild(btn);
      this.spellButtons.push(btn);
    }
  }

  /** Handles spell casting and visual feedback for both grid and sprite clicks */
  private async handleSpellCast(target: Unit | null, cellPosition?: { x: number, y: number }) {
    const caster = this.turnManager.getCurrentUnit();
    const spell = caster.selectedSpell;
    if (!spell || caster.ap < spell.cost) return;
    // Centralized validation: check cooldown and max casts per turn
    const casts = caster.castsThisTurn[spell.name] ?? 0;
    if ((spell.cooldownCounter && spell.cooldownCounter > 0) || (spell.maxCastsPerTurn !== -1 && casts >= spell.maxCastsPerTurn)) return;
    let spellUsed = false;
    let canCast = false;
    if ((spell.targetType === 'empty' || spell.targetType === 'unitOrEmpty') && !target) {
      canCast = spell.canCast(caster, null, { map: this.map, cellPosition, scene: this });
    } else if (target instanceof Unit) {
      canCast = spell.canCast(caster, target, { map: this.map, cellPosition: target.position, scene: this });
    }
    if (!canCast) return;
    let result = false;
    if ((spell.targetType === 'empty' || spell.targetType === 'unitOrEmpty') && !target) {
      result = spell.cast(caster, null, { map: this.map, scene: this, cellPosition });
    } else if (target instanceof Unit) {
      result = spell.cast(caster, target, { map: this.map, scene: this, cellPosition: target.position });
    }
    if (result) {
      caster.castsThisTurn[spell.name] = casts + 1;
      spellUsed = true;
      this.updateTurnLabel();
      this.updateUnitSprites();
      this.setupSpellListeners();
    }
    if (spellUsed) {
      caster.selectedSpellIdx = -1;
      this.createSpellBar();
      this.updateReachableAndHighlights();
    }
  }

  /** Interaction logic: only the active unit can move or cast spells */
  private setupInteraction() {
    // Movement on the grid
    this.gridView.on('pointermove', (e: any) => {
      if (this.isMoving) return;
      this.clearEnemyHighlights();
      this.updateReachableAndHighlights();
      const unit = this.turnManager.getCurrentUnit();
      const selectedSpell = unit.selectedSpell;
      const localX = e.global.x - this.gameContainer.x;
      const localY = e.global.y - this.gameContainer.y;
      const mouseCell: Position | null = this.gridView.getCellAtPixel(localX, localY);
      if (mouseCell) {
        // Highlight valid target using canCast
        if (selectedSpell && unit.ap >= selectedSpell.cost) {
          if (selectedSpell.effectType === 'teleport') {
            const dummyTarget = { position: mouseCell } as Unit;
            if (selectedSpell.canCast(unit, dummyTarget)) {
              BattleVisuals.highlightTargetCell(this.spellRangeLayer, mouseCell, 0xf1c40f);
            }
          } else {
            const target = this.units.find(u => u.position.x === mouseCell.x && u.position.y === mouseCell.y);
            if (target && selectedSpell.canCast(unit, target)) {
              // Use the first effect type as reference for tint
              const mainEffectType = selectedSpell.effects[0]?.type as EffectType;
              let color = getTargetTint(mainEffectType);
              const sprite = this.unitSprites.get(target.id);
              if (sprite) BattleVisuals.highlightUnitSprite(sprite, color);
            }
          }
        }
        // Path and movement highlights
        if (!selectedSpell && this.isCellReachable(mouseCell, unit)) {
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
    // Click on the grid for teleport, heal, or damage
    this.gridView.on('pointerdown', async (e: any) => {
      if (this.isMoving) return;
      const caster = this.turnManager.getCurrentUnit();
      const spell = caster.selectedSpell;
      const localX = e.global.x - this.gameContainer.x;
      const localY = e.global.y - this.gameContainer.y;
      const pos = this.gridView.getCellAtPixel(localX, localY);
      if (!pos) return;
      if (spell && caster.ap >= spell.cost) {
        let target = this.units.find(u => u.position.x === pos.x && u.position.y === pos.y) || null;
        if ((spell.targetType === 'empty' || spell.targetType === 'unitOrEmpty') && !target) {
          await this.handleSpellCast(null, pos);
        } else if (target && spell.canCast(caster, target, { map: this.map, cellPosition: pos })) {
          await this.handleSpellCast(target, pos);
        }
      } else if (!spell || (spell && caster.ap < spell.cost)) {
        // Normal movement
        if (!spell && this.isCellReachable(pos, caster)) {
          const path = this.grid.findPath(caster.position, pos, caster.mp, this.map);
          if (path && path.length > 0 && path.length <= caster.mp) {
            this.isMoving = true;
            this.map.setOccupied(caster.position, null);
            let prevPos = caster.position;
            await caster.moveTo(path, async (stepPos) => {
              this.map.setOccupied(prevPos, null);
              this.map.setOccupied(stepPos, caster);
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
      }
    });
    // Listeners en sprites: solo delegan a handleSpellCast
    this.setupSpellListeners();
    this.positionSpellBar();
  }

  /** Checks if a cell is reachable for the active unit */
  private isCellReachable(pos: Position, unit: Unit): boolean {
    return this.reachable.some(c => c.x === pos.x && c.y === pos.y);
  }

  /** Clears enemy highlights */
  private clearEnemyHighlights() {
    BattleVisuals.resetAllUnitSpriteTints(this.units, this.unitSprites, this.turnManager.getCurrentUnit().id);
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
    this.updateReachableAndHighlights();
  }

  /**
   * Sets up listeners for all unit sprites based on spell.canCast.
   * Uses a helper to apply listeners and visual feedback.
   */
  private setupSpellListeners() {
    const caster = this.turnManager.getCurrentUnit();
    const spell = caster.selectedSpell;
    for (const unit of this.units) {
      const sprite = this.unitSprites.get(unit.id);
      if (!sprite) continue;
      sprite.removeAllListeners && sprite.removeAllListeners('pointerdown');
      sprite.eventMode = 'none';
      sprite.cursor = '';
      if (!spell || caster.ap < spell.cost) continue;
      // Use only spell.canCast for all targeting (including self-heal)
      if (this.isCellReachable(unit.position, caster) && spell.canCast(caster, unit, { map: this.map, cellPosition: unit.position })) {
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        sprite.on('pointerdown', () => {
          this.handleSpellCast(unit, unit.position);
        });

      }
    }
  }

  /**
   * Helper to apply a spell listener and visual feedback to a sprite.
   */
  private applySpellListener(sprite: Container, caster: Unit, target: Unit, spell: Spell) {
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointerdown', () => {
      this.handleSpellCast(target);
    });
    // Optionally, add visual feedback (e.g., highlight sprite)
    // ...
  }
} 