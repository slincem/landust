// SpellSystem.ts
// Handles spell selection, validation, and casting for the tactical RPG battle system.
// This class is responsible for checking spell availability, cooldowns, and applying spell effects.

import { Unit } from '@core/Unit';
import { Spell } from '@core/Spell';
import type { Position } from '@core/Grid';
import type { MapGrid } from '@core/MapGrid';
import type { BattleScene } from '@scenes/BattleScene';
import { BattleVisuals } from '../../scenes/BattleVisuals';

export class SpellSystem {
  constructor(
    private scene: BattleScene,
    private map: MapGrid
  ) {}

  /** Handles spell casting and visual feedback for both grid and sprite clicks. Used by BattleScene. */
  public handleSpellCast(target: Unit | null, cellPosition?: Position) {
    const caster = this.scene.turnManager.getCurrentUnit();
    if (!caster || !caster.isAlive()) return;
    const spell = caster.selectedSpell;
    if (!spell || caster.ap < spell.cost) return;
    // Centralized validation: check cooldown and max casts per turn
    const casts = caster.castsThisTurn[spell.name] ?? 0;
    if ((spell.cooldownCounter && spell.cooldownCounter > 0) || (spell.maxCastsPerTurn !== -1 && casts >= spell.maxCastsPerTurn)) return;
    let spellUsed = false;
    let canCast = false;
    if ((spell.targetType === 'empty' || spell.targetType === 'unitOrEmpty') && !target) {
      canCast = spell.canCast(caster, null, { map: this.map, cellPosition, scene: this.scene });
    } else if (target instanceof Unit) {
      if (!target.isAlive()) return; // Prevent casting on dead units
      canCast = spell.canCast(caster, target, { map: this.map, cellPosition: target.position, scene: this.scene });
    }
    if (!canCast) return;
    let result = false;
    if ((spell.targetType === 'empty' || spell.targetType === 'unitOrEmpty') && !target) {
      result = spell.cast(caster, null, { map: this.map, scene: this.scene, cellPosition });
    } else if (target instanceof Unit) {
      result = spell.cast(caster, target, { map: this.map, scene: this.scene, cellPosition: target.position });
    }
    if (result) {
      caster.castsThisTurn[spell.name] = casts + 1;
      spellUsed = true;
      // If the target died as a result of the spell, handle its death
      if (target instanceof Unit && !target.isAlive()) {
        this.scene.handleUnitDeath(target);
      }
      // If the caster died as a result of the spell (e.g., recoil), handle its death
      if (!caster.isAlive()) {
        this.scene.handleUnitDeath(caster);
      }
      this.scene.updateTurnLabel();
      this.scene.updateUnitSprites();
      this.setupSpellListeners();
    }
    if (spellUsed) {
      caster.selectedSpellIdx = -1;
      this.scene.createSpellBar();
      this.scene.updateReachableAndHighlights();
    }
  }

  /** Sets up listeners for all unit sprites based on spell.canCast. Used by BattleScene. */
  public setupSpellListeners() {
    const caster = this.scene.turnManager.getCurrentUnit();
    const spell = caster ? caster.selectedSpell : undefined;
    for (const unit of this.scene.units) {
      if (!unit.isAlive()) continue; // Skip dead units
      const sprite = this.scene.unitSprites.get(unit.id);
      if (!sprite) continue;
      sprite.removeAllListeners && sprite.removeAllListeners('pointerdown');
      sprite.eventMode = 'none';
      sprite.cursor = '';
      if (!spell || !caster || !caster.isAlive() || !unit.isAlive() || caster.ap < spell.cost) continue;
      // Use only spell.canCast for all targeting (including self-heal)
      if (this.scene.movementSystem.isCellReachable(unit.position, caster) && spell.canCast(caster, unit, { map: this.map, cellPosition: unit.position })) {
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        sprite.on('pointerdown', () => {
          this.handleSpellCast(unit, unit.position);
        });
      }
    }
  }
} 