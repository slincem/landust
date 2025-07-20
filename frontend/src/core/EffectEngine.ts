// EffectEngine.ts
// Centralizes all effect application logic for spells (damage, heal, teleport, buffs, etc).

import type { Unit } from './Unit';
import type { State } from './Unit';
import { FloatingText } from '../ui/FloatingText';

export type EffectType = 'damage' | 'heal' | 'teleport' | 'buff' | 'debuff' | 'drain_ap';

export interface EffectContext {
  map?: any;
  scene?: any;
  cellPosition?: { x: number, y: number };
  // Extend with more context as needed (e.g., for area, line, etc)
}

export class EffectEngine {
  /**
   * Applies the effect of a spell, consumes AP, and shows feedback visual.
   * @param spell The full Spell object containing effect details.
   * @param caster The unit casting the spell
   * @param target The target unit (or null for cell effects)
   * @param context Additional context (map, scene, cellPosition, etc)
   * @returns true if the effect was applied, false otherwise
   */
  static applyEffect(
    spell: { effectType: EffectType, value: number, cost: number, effect?: any },
    caster: Unit,
    target: Unit | null,
    context?: EffectContext
  ): boolean {
    // 1. Get effect config from spell
    const effect = spell.effect ?? {};
    const effectType: EffectType = effect.type ?? spell.effectType;
    const value: number = effect.value ?? spell.value;
    const duration: number = effect.duration ?? 1;
    const expire: 'start' | 'end' = effect.expire ?? 'start';
    const spellCost = spell.cost ?? 0;
    // 2. Subtract AP
    if (spellCost > 0) {
      if (caster.ap < spellCost) return false;
      caster.ap -= spellCost;
    }
    let effectText = '';
    let color = '#ff4444';
    let feedbackPos = { x: 0, y: 0 };
    let feedbackLayer = context?.scene?.unitLayer;
    let result = false;
    switch (effectType) {
      case 'drain_ap':
        if (target) {
          target.loseAP(value);
          // Apply a temporary 'ap_loss' state with configurable duration/expire
          const state: State = {
            id: `ap_loss_${Date.now()}_${Math.random()}`,
            type: 'ap_loss',
            duration,
            value,
            expire
          };
          target.applyState(state);
          effectText = `-${value} AP`;
          color = '#3a8fff';
          feedbackPos = EffectEngine.getTargetPos(target);
          result = true;
        }
        break;
      case 'damage':
        if (target) {
          target.takeDamage(value);
          effectText = `-${value} HP`;
          color = '#ff4444';
          feedbackPos = EffectEngine.getTargetPos(target);
          result = true;
        }
        break;
      case 'heal':
        if (target) {
          target.heal(value);
          effectText = `+${value} HP`;
          color = '#3ecf4a';
          feedbackPos = EffectEngine.getTargetPos(target);
          result = true;
        }
        break;
      case 'teleport':
        if (context?.map && context?.cellPosition) {
          const pos = context.cellPosition;
          if (context.map.isWalkable(pos) && !context.map.isOccupied(pos)) {
            context.map.setOccupied(caster.position, null);
            caster.position = { ...pos };
            context.map.setOccupied(pos, caster);
            if (context.scene && typeof context.scene.updateUnitSprites === 'function') {
              context.scene.updateUnitSprites();
            }
            effectText = `Teleport!`;
            color = '#f1c40f';
            feedbackPos = { x: pos.x * 64 + 32, y: pos.y * 64 };
            result = true;
          }
        }
        break;
      // TODO: Add buffs, debuffs, area, etc.
      default:
        break;
    }
    // Show feedback visual if needed
    if (effectText && feedbackLayer) {
      FloatingText.show(feedbackLayer, effectText, feedbackPos.x, feedbackPos.y, color);
    }
    return result;
  }

  /**
   * Helper para obtener la posición visual de un target (sprite o celda)
   */
  private static getTargetPos(target: Unit): { x: number, y: number } {
    const sprite = (target as any).sprite || (target as any).getSprite?.();
    if (sprite) {
      return { x: sprite.x, y: sprite.y - 32 };
    } else if (target.position) {
      return { x: target.position.x * 64 + 32, y: target.position.y * 64 };
    }
    return { x: 0, y: 0 };
  }
} 