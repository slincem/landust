// Spell.ts
import type { Unit } from './Unit';
import type { Position } from './MapGrid';
import { FloatingText } from '../ui/FloatingText';

export type SpellEffectType = 'damage' | 'heal' | 'drain_ap' | 'teleport';

export type SpellTargetType =
  | 'unit'
  | 'enemy'
  | 'ally'
  | 'selfOnly'
  | 'unitOrEmpty'
  | 'empty'
  | 'none';

export interface SpellConfig {
  name: string;
  cost: number;
  range: number;
  minRange?: number;
  effectType: SpellEffectType;
  value: number;
  maxCastsPerTurn?: number;
  canTargetEnemies?: boolean;
  // New targeting properties for heal
  canTargetSelf?: boolean;
  canTargetAllies?: boolean;
  canTargetEnemiesHeal?: boolean;
  targetType: SpellTargetType;
}

/**
 * Represents a spell (ability) that can be cast by a unit.
 * All targeting and castability logic is encapsulated here.
 */
export class Spell {
  name: string;
  cost: number;
  range: number;
  minRange: number;
  effectType: SpellEffectType;
  value: number;
  maxCastsPerTurn: number;
  canTargetEnemies: boolean;
  // New targeting properties for heal
  canTargetSelf: boolean;
  canTargetAllies: boolean;
  canTargetEnemiesHeal: boolean;
  targetType: SpellTargetType;

  constructor(config: SpellConfig) {
    this.name = config.name;
    this.cost = config.cost;
    this.range = config.range;
    this.minRange = config.minRange ?? 1;
    this.effectType = config.effectType;
    this.value = config.value;
    this.maxCastsPerTurn = config.maxCastsPerTurn ?? 1;
    this.canTargetEnemies = config.canTargetEnemies ?? (this.effectType === 'heal' ? false : true);
    // New targeting properties for heal
    this.canTargetSelf = config.canTargetSelf ?? (this.effectType === 'heal');
    this.canTargetAllies = config.canTargetAllies ?? (this.effectType === 'heal');
    this.canTargetEnemiesHeal = config.canTargetEnemiesHeal ?? false;
    this.targetType = config.targetType;
  }

  /**
   * Determines if this spell can be cast on the target by the caster, based solely on targetType.
   * - For 'empty' and 'unitOrEmpty', target can be null (cell).
   * - For 'none', target is ignored.
   * - For all others, target must be a Unit.
   * - All range, AP, and alive checks are included here.
   */
  canCast(caster: Unit, target: Unit | null, context?: { map?: any, cellPosition?: { x: number, y: number } }): boolean {
    console.log('[canCast]', this.name, 'targetType:', this.targetType, 'caster:', caster.name, 'target:', target?.name || 'null');
    
    // Range and AP checks (if needed)
    if (this.targetType !== 'none') {
      if (!target && this.targetType !== 'empty' && this.targetType !== 'unitOrEmpty') {
        console.log('[canCast] No target for non-empty spell');
        return false;
      }
      const pos = target ? target.position : context?.cellPosition;
      if (!pos) {
        console.log('[canCast] No position available');
        return false;
      }
      const dx = Math.abs(caster.position.x - pos.x);
      const dy = Math.abs(caster.position.y - pos.y);
      const dist = Math.max(dx, dy);
      console.log('[canCast] Distance:', dist, 'range:', this.range, 'minRange:', this.minRange, 'AP:', caster.ap, 'cost:', this.cost);
      if (dist > this.range || dist < this.minRange) {
        console.log('[canCast] Distance check failed');
        return false;
      }
      if (caster.ap < this.cost) {
        console.log('[canCast] AP check failed');
        return false;
      }
    }
    
    switch (this.targetType) {
      case 'unit':
        const unitResult = !!target && target.isAlive();
        console.log('[canCast][unit] result:', unitResult);
        return unitResult;
      case 'enemy':
        const enemyResult = !!target && target.isAlive() && caster.isEnemyOf(target);
        console.log('[canCast][enemy] result:', enemyResult);
        return enemyResult;
      case 'ally':
        const allyResult = !!target && target.isAlive() && caster.isAllyOf(target);
        console.log('[canCast][ally] result:', allyResult);
        return allyResult;
      case 'selfOnly':
        const selfResult = !!target && target.isAlive() && caster.isSelf(target);
        console.log('[canCast][selfOnly] target alive:', target?.isAlive(), 'isSelf:', caster.isSelf(target), 'result:', selfResult);
        return selfResult;
      case 'unitOrEmpty':
        if (target && target.isAlive()) {
          console.log('[canCast][unitOrEmpty] unit alive, returning true');
          return true;
        }
        if (context?.map && context.cellPosition) {
          const walk = context.map.isWalkable(context.cellPosition);
          const occ = context.map.isOccupied(context.cellPosition);
          console.log('[canCast][unitOrEmpty] cell', context.cellPosition, 'walkable:', walk, 'occupied:', occ);
          return walk && !occ;
        }
        return false;
      case 'empty':
        if (!context?.map || !context.cellPosition) return false;
        const walk = context.map.isWalkable(context.cellPosition);
        const occ = context.map.isOccupied(context.cellPosition);
        console.log('[canCast][empty] cell', context.cellPosition, 'walkable:', walk, 'occupied:', occ);
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
   * Executes the spell effect, handling both Unit and empty cell targets based on targetType.
   * - For Unit targets: applies damage, heal, drain, etc.
   * - For empty cell targets: applies effects like teleport, traps, etc.
   * - Feedback visual is shown in both cases.
   * - All logic is encapsulated here; BattleScene is agnostic.
   */
  cast(caster: Unit, target: Unit | null, context?: { map?: any, scene?: any, cellPosition?: { x: number, y: number } }): boolean {
    if (!this.canCast(caster, target, context)) return false;
    caster.ap -= this.cost;
    let effectText = '';
    let color = '#ff4444';
    let result = false;
    // Handle Unit targets
    if (target && (this.targetType === 'unit' || this.targetType === 'enemy' || this.targetType === 'ally' || this.targetType === 'selfOnly')) {
      switch (this.effectType) {
        case 'damage':
          target.takeDamage(this.value);
          effectText = `-${this.value} HP`;
          color = '#ff4444';
          result = true;
          break;
        case 'heal':
          target.heal(this.value);
          effectText = `+${this.value} HP`;
          color = '#3ecf4a';
          result = true;
          break;
        case 'drain_ap':
          const lost = target.loseAP(this.value);
          effectText = `-${lost} AP`;
          color = '#3a8fff';
          if (typeof target.preventAPRestore === 'function') target.preventAPRestore();
          result = true;
          break;
        // Add more unit-based effects here
      }
      // Feedback visual for Unit
      if (effectText) {
        let container = (target as any).sceneContainer || (target as any).battleScene?.unitLayer || context?.scene?.unitLayer;
        let sprite = (target as any).sprite || (target as any).getSprite?.();
        let x = 0, y = 0;
        if (sprite) {
          x = sprite.x;
          y = sprite.y - 32;
        } else if (target.position) {
          x = target.position.x * 64 + 32;
          y = target.position.y * 64;
        }
        if (container) {
          FloatingText.show(container, effectText, x, y, color);
        }
      }
      return result;
    }
    // Handle empty cell targets (e.g., teleport)
    if ((this.targetType === 'empty' || this.targetType === 'unitOrEmpty') && !target && context?.cellPosition) {
      switch (this.effectType) {
        case 'teleport':
          if (!context?.map || !context?.scene) return false;
          const pos = context.cellPosition;
          const walk = context.map.isWalkable(pos);
          const occ = context.map.isOccupied(pos);
          console.log('[cast][teleport] cell', pos, 'walkable:', walk, 'occupied:', occ);
          if (walk && !occ) {
            caster.position = { ...pos };
            if (context.scene && typeof context.scene.updateUnitSprites === 'function') {
              context.scene.updateUnitSprites();
            }
            effectText = `Teleport!`;
            color = '#f1c40f';
            result = true;
            // Feedback visual at cell
            if (context.scene?.unitLayer) {
              FloatingText.show(context.scene.unitLayer, effectText, pos.x * 64 + 32, pos.y * 64, color);
            }
            console.log('[cast][teleport] Teleport successful to', pos);
          } else {
            console.log('[cast][teleport] Teleport failed: cell not walkable or occupied', pos);
          }
          break;
        // Add more cell-based effects here
      }
      return result;
    }
    // Optionally handle 'none' or other future types
    return false;
  }
} 