// Spell.ts
// Handles spell configuration, targeting validation, and effect delegation

import type { Unit } from './Unit';
import type { EffectType } from './EffectEngine';
import { EffectEngine } from './EffectEngine';
import type { EffectContext } from './effects';

export type SpellEffectType = 'damage' | 'heal' | 'drain_ap' | 'teleport';

export type SpellTargetType =
  | 'selfOnly'
  | 'allyOnly'
  | 'ally'
  | 'enemy'
  | 'unit'
  | 'none';

export interface SpellEffectConfig {
  type: EffectType;
  value: number;
  duration?: number;
  // Add more effect params as needed
  // NUEVO: para efectos que requieren saber el hechizo origen
  sourceSpell?: string;
}

export interface SpellConfig {
  name: string;
  cost: number;
  range: number;
  minRange?: number;
  maxCastsPerTurn?: number;
  targetType: string;
  effects: SpellEffectConfig[];
  cooldown?: number;
}

/**
 * Spell: Handles targeting and validation. Delegates effect application to EffectEngine.
 */
export class Spell {
  name: string;
  cost: number;
  range: number;
  minRange: number;
  maxCastsPerTurn: number;
  targetType: string;
  effects: SpellEffectConfig[];
  cooldown?: number;
  cooldownCounter: number = 0;

  constructor(config: SpellConfig) {
    this.name = config.name;
    this.cost = config.cost;
    this.range = config.range;
    this.minRange = config.minRange ?? 1;
    this.maxCastsPerTurn = config.maxCastsPerTurn ?? 1;
    this.targetType = config.targetType;
    this.effects = config.effects;
    this.cooldown = config.cooldown;
    this.cooldownCounter = 0;
  }

  /**
   * Validates if the spell can be cast on the target (targeting logic only).
   */
  canCast(caster: Unit, target: Unit | null, context?: { map?: any, cellPosition?: { x: number, y: number } }): boolean {
    // For selfOnly, if target is null, use caster for validation
    let actualTarget = target;
    if (this.targetType === 'selfOnly' && !actualTarget) {
      actualTarget = caster;
    }
    // For other types, allow null target if cellPosition exists (for empty/unitOrEmpty)
    let pos = null;
    if (this.targetType === 'empty' || this.targetType === 'unitOrEmpty') {
      pos = context?.cellPosition;
    } else if (actualTarget) {
      pos = actualTarget.position;
    } else if (context?.cellPosition) {
      pos = context.cellPosition;
    }
    if (this.targetType !== 'none') {
      if (!pos) return false;
      const dx = Math.abs(caster.position.x - pos.x);
      const dy = Math.abs(caster.position.y - pos.y);
      const dist = dx + dy;
      if (dist > this.range || dist < this.minRange) return false;
      if (caster.ap < this.cost) return false;
    }
    // Target type validation
    switch (this.targetType) {
      case 'selfOnly':
        // Permitir selfOnly sobre uno mismo aunque target sea null
        return !!actualTarget && actualTarget.isAlive() && caster.isSelf(actualTarget);
      case 'allyOnly':
        // No incluye al caster
        return !!actualTarget && actualTarget.isAlive() && caster.isAllyOf(actualTarget) && !caster.isSelf(actualTarget);
      case 'ally':
        // Incluye al caster si es aliado de sí mismo
        return !!actualTarget && actualTarget.isAlive() && caster.isAllyOf(actualTarget);
      case 'enemy':
        return !!actualTarget && actualTarget.isAlive() && caster.isEnemyOf(actualTarget);
      case 'unit':
        return !!actualTarget && actualTarget.isAlive();
      case 'empty':
        if (!context?.map || !context.cellPosition) return false;
        const walk = context.map.isWalkable(context.cellPosition);
        const occ = context.map.isOccupied(context.cellPosition);
        return walk && !occ;
      case 'unitOrEmpty':
        if (actualTarget && actualTarget.isAlive()) return true;
        if (context?.map && context.cellPosition) {
          const walk = context.map.isWalkable(context.cellPosition);
          const occ = context.map.isOccupied(context.cellPosition);
          return walk && !occ;
        }
        return false;
      case 'none':
        return true;
      default:
        return false;
    }
  }

  /**
   * Returns all valid targets for this spell given a caster and a list of units.
   * Used for area highlighting and UI.
   */
  getValidTargets(caster: Unit, units: Unit[]): Unit[] {
    return units.filter(target => this.canCast(caster, target));
  }

  /**
   * Applies all effects of the spell by delegating to EffectEngine.
   */
  cast(
    caster: Unit,
    target: Unit | null,
    context?: EffectContext
  ): boolean {
    // Para selfOnly, si target es null, usar caster como target
    let actualTarget = target;
    if (this.targetType === 'selfOnly' && !actualTarget) {
      actualTarget = caster;
    }
    // No hacer validaciones adicionales aquí, solo delegar a EffectEngine
    const spellName = this.name;
    const effectsWithSource = this.effects.map(e => ({ ...e, sourceSpell: spellName }));
    const spellObj = { ...this, effects: effectsWithSource };
    const result = EffectEngine.applySpell(spellObj, caster, actualTarget, context);
    if (result && this.cooldown) {
      this.cooldownCounter = this.cooldown;
    }
    return result;
  }

  decrementCooldown() {
    if (this.cooldownCounter && this.cooldownCounter > 0) {
      this.cooldownCounter--;
    }
  }
} 