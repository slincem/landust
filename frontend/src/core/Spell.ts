// Spell.ts
import type { Unit } from './Unit';
import type { Position } from './MapGrid';
import { FloatingText } from '../ui/FloatingText';
import { EffectEngine, EffectType, EffectContext } from './EffectEngine';

export type SpellEffectType = 'damage' | 'heal' | 'drain_ap' | 'teleport';

export type SpellTargetType =
  | 'unit'
  | 'enemy'
  | 'ally'
  | 'selfOnly'
  | 'unitOrEmpty'
  | 'empty'
  | 'none';

export interface SpellEffectConfig {
  type: EffectType;
  value: number;
  duration?: number;
  expire?: 'start' | 'end';
  // Add more effect params as needed
}

export interface SpellConfig {
  name: string;
  cost: number;
  range: number;
  minRange?: number;
  maxCastsPerTurn?: number;
  targetType: string;
  effects: SpellEffectConfig[];
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

  constructor(config: SpellConfig) {
    this.name = config.name;
    this.cost = config.cost;
    this.range = config.range;
    this.minRange = config.minRange ?? 1;
    this.maxCastsPerTurn = config.maxCastsPerTurn ?? 1;
    this.targetType = config.targetType;
    this.effects = config.effects;
  }

  /**
   * Validates if the spell can be cast on the target (targeting logic only).
   */
  canCast(caster: Unit, target: Unit | null, context?: { map?: any, cellPosition?: { x: number, y: number } }): boolean {
    // Range and AP checks (if needed)
    if (this.targetType !== 'none') {
      if (!target && this.targetType !== 'empty' && this.targetType !== 'unitOrEmpty') return false;
      const pos = target ? target.position : context?.cellPosition;
      if (!pos) return false;
      const dx = Math.abs(caster.position.x - pos.x);
      const dy = Math.abs(caster.position.y - pos.y);
      const dist = Math.max(dx, dy);
      if (dist > this.range || dist < this.minRange) return false;
      if (caster.ap < this.cost) return false;
    }
    
    switch (this.targetType) {
      case 'unit':
        return !!target && target.isAlive();
      case 'enemy':
        return !!target && target.isAlive() && caster.isEnemyOf(target);
      case 'ally':
        return !!target && target.isAlive() && caster.isAllyOf(target);
      case 'selfOnly':
        return !!target && target.isAlive() && caster.isSelf(target);
      case 'unitOrEmpty':
        if (target && target.isAlive()) return true;
        if (context?.map && context.cellPosition) {
          const walk = context.map.isWalkable(context.cellPosition);
          const occ = context.map.isOccupied(context.cellPosition);
          return walk && !occ;
        }
        return false;
      case 'empty':
        if (!context?.map || !context.cellPosition) return false;
        const walk = context.map.isWalkable(context.cellPosition);
        const occ = context.map.isOccupied(context.cellPosition);
        return walk && !occ;
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
    return EffectEngine.applySpell(this, caster, target, context);
  }
} 