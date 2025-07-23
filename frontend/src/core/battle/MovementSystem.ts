// MovementSystem.ts
// Handles movement and pathfinding logic for the tactical RPG battle system.
// This class is responsible for calculating reachable cells and moving units along paths.

import type { Unit } from '@core/Unit';
import type { Position, Grid } from '@core/Grid';
import type { MapGrid } from '@core/MapGrid';
import type { BattleScene } from '@scenes/BattleScene';
import { BattleVisuals } from '../../scenes/BattleVisuals';

export class MovementSystem {
  constructor(
    private scene: BattleScene,
    private grid: Grid,
    private map: MapGrid
  ) {}

  /** Returns true if a cell is reachable for the given unit. */
  public isCellReachable(pos: Position, unit: Unit): boolean {
    return this.scene.reachable.some(c => c.x === pos.x && c.y === pos.y);
  }

  /** Updates the reachable cells and highlights for the current unit/spell. Used by BattleScene. */
  public updateReachableAndHighlights() {
    const caster = this.scene.turnManager.getCurrentUnit();
    const spell = caster.selectedSpell;
    this.scene.spellRangeLayer.clear();
    this.scene.moveRangeLayer.clear();
    this.scene.reachable = [];
    if (spell && caster.ap >= spell.cost) {
      // First, show all cells in spell range (Manhattan distance)
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const pos = { x, y };
          if (!this.isCellInSpellRange(caster, spell, pos)) continue;
          // Show area of effect (all in range) with low alpha
          BattleVisuals.highlightTargetCell(this.scene.spellRangeLayer, pos, 0x888888, 0.10);
        }
      }
      // Now, highlight valid targets with effect color
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const pos = { x, y };
          if (!this.isCellInSpellRange(caster, spell, pos)) continue;
          let isValid = false;
          let color = 0xff4444;
          let target = this.scene.units.find(u => u.position.x === x && u.position.y === y) || null;
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
            this.scene.reachable.push({ x, y });
            BattleVisuals.highlightTargetCell(this.scene.spellRangeLayer, pos, color, 0.32);
          }
        }
      }
    } else {
      this.scene.reachable = this.grid.getReachableCells(caster.position, caster.mp, this.map);
      for (const cell of this.scene.reachable) {
        BattleVisuals.highlightTargetCell(this.scene.moveRangeLayer, cell, 0x3a8fff, 0.18);
      }
    }
    this.scene.gridView.showPath([]);
  }

  /** Returns true if the cell is in Manhattan range for the given spell. */
  public isCellInSpellRange(caster: Unit, spell: Spell, pos: Position): boolean {
    const dx = Math.abs(caster.position.x - pos.x);
    const dy = Math.abs(caster.position.y - pos.y);
    const dist = dx + dy;
    return dist <= spell.range && dist >= spell.minRange;
  }

  /** Sets up pointer/movement/casting interaction. Used by BattleScene. */
  public setupInteraction() {
    // Movement on the grid
    this.scene.gridView.on('pointermove', (e: any) => {
      if (this.scene.isMoving) return;
      const currentUnit = this.scene.turnManager.getCurrentUnit();
      if (!currentUnit || !currentUnit.isAlive()) return;
      this.scene.battleUI.updateUnitSprites();
      this.updateReachableAndHighlights();
      const unit = currentUnit;
      const selectedSpell = unit.selectedSpell;
      const localX = e.global.x - this.scene.gameContainer.x;
      const localY = e.global.y - this.scene.gameContainer.y;
      const mouseCell: Position | null = this.scene.gridView.getCellAtPixel(localX, localY);
      if (mouseCell) {
        // Highlight valid target using canCast
        if (selectedSpell && unit.ap >= selectedSpell.cost) {
          if (selectedSpell.effects[0]?.type === 'teleport') {
            const dummyTarget = { position: mouseCell } as Unit;
            if (selectedSpell.canCast(unit, dummyTarget)) {
              BattleVisuals.highlightTargetCell(this.scene.spellRangeLayer, mouseCell, 0xf1c40f);
            }
          } else {
            const target = this.scene.units.find(u => u.position.x === mouseCell.x && u.position.y === mouseCell.y);
            if (target && target.isAlive() && selectedSpell.canCast(unit, target)) {
              const mainEffectType = selectedSpell.effects[0]?.type;
              let color = BattleVisuals.getTargetTint(mainEffectType);
              const sprite = this.scene.unitSprites.get(target.id);
              if (sprite) BattleVisuals.highlightUnitSprite(sprite, color);
            }
          }
        }
        // Path and movement highlights
        if (!selectedSpell && this.isCellReachable(mouseCell, unit)) {
          const path = this.grid.findPath(unit.position, mouseCell, unit.mp, this.map);
          if (path && path.length > 0 && path.length <= unit.mp) {
            this.scene.currentPath = path;
            this.scene.gridView.showPath(path);
          } else {
            this.scene.gridView.showPath([]);
          }
        } else {
          this.scene.gridView.showPath([]);
        }
      } else {
        this.scene.gridView.showPath([]);
      }
    });
    // Clears spell range and highlights when leaving the grid
    this.scene.gridView.on('pointerout', () => {
      this.scene.spellRangeLayer.clear();
      this.scene.moveRangeLayer.clear();
      this.scene.battleUI.updateUnitSprites();
      this.scene.gridView.showPath([]);
    });
    // Click on the grid for teleport, heal, or damage
    this.scene.gridView.on('pointerdown', async (e: any) => {
      if (this.scene.isMoving) return;
      const currentUnit = this.scene.turnManager.getCurrentUnit();
      if (!currentUnit || !currentUnit.isAlive()) return;
      const caster = currentUnit;
      const spell = caster.selectedSpell;
      const localX = e.global.x - this.scene.gameContainer.x;
      const localY = e.global.y - this.scene.gameContainer.y;
      const pos = this.scene.gridView.getCellAtPixel(localX, localY);
      if (!pos) return;
      if (spell && caster.ap >= spell.cost) {
        let target = this.scene.units.find(u => u.position.x === pos.x && u.position.y === pos.y) || null;
        if (target && !target.isAlive()) return; // Prevent targeting dead units
        if ((spell.targetType === 'empty' || spell.targetType === 'unitOrEmpty') && !target) {
          this.scene.spellSystem.handleSpellCast(null, pos);
        } else if (target && spell.canCast(caster, target, { map: this.map, cellPosition: pos })) {
          this.scene.spellSystem.handleSpellCast(target, pos);
        }
      }
      // Normal movement
      if (!spell && this.isCellReachable(pos, caster)) {
        const path = this.grid.findPath(caster.position, pos, caster.mp, this.map);
        if (path && path.length > 0 && path.length <= caster.mp) {
          this.scene.isMoving = true;
          this.map.setOccupied(caster.position, null);
          let prevPos = caster.position;
          await caster.moveTo(path, async (stepPos) => {
            this.map.setOccupied(prevPos, null);
            this.map.setOccupied(stepPos, caster);
            prevPos = stepPos;
            this.scene.battleUI.updateUnitSprites();
            await new Promise(res => setTimeout(res, 200));
          });
          this.scene.battleUI.updateUnitSprites();
          this.updateReachableAndHighlights();
          this.scene.isMoving = false;
          this.scene.battleUI.updateEndTurnButton();
        }
      }
    });
    // Listeners en sprites: solo delegan a handleSpellCast
    this.scene.spellSystem.setupSpellListeners();
    this.scene.battleUI.positionSpellBar();
  }
} 