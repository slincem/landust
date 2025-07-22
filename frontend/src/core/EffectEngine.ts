// EffectEngine.ts
// Centralizes all effect application logic for spells (damage, heal, teleport, buffs, etc).

import type { Unit } from './Unit';
import type { State } from './Unit';
import type { SpellEffectConfig } from './Spell';
import { FloatingText } from '../ui/FloatingText';

export type EffectType = 'damage' | 'heal' | 'teleport' | 'buff' | 'debuff' | 'drain_ap' | 'buff_ap';

export interface EffectContext {
  map?: any;
  scene?: any;
  cellPosition?: { x: number, y: number };
  // Extend with more context as needed (e.g., for area, line, etc)
}

export class EffectEngine {
  /**
   * Returns the color for a given effect type for floating feedback text.
   * Easily extensible for new effect types.
   */
  static getEffectColor(effectType: EffectType): string {
    switch (effectType) {
      case 'damage':
        return '#ff4444'; // Red
      case 'heal':
        return '#3ecf4a'; // Green
      case 'buff_ap':
        return '#3a8fff'; // Light blue
      case 'drain_ap':
        return '#6a5acd'; // Purple/blue (debuff)
      case 'teleport':
        return '#f1c40f'; // Yellow
      // Add more cases for new effect types as needed
      default:
        return '#ff4444'; // Default to red
    }
  }

  /**
   * Applies the effect of a spell, consumes AP, and shows feedback visual.
   * @param spell The full Spell object containing effect details.
   * @param caster The unit casting the spell
   * @param target The target unit (or null for cell effects)
   * @param context Additional context (map, scene, cellPosition, etc)
   * @returns true if the effect was applied, false otherwise
   */
  static applyEffect(
    effect: SpellEffectConfig,
    caster: Unit,
    target: Unit | null,
    context?: EffectContext
  ): boolean {
    const effectType: EffectType = effect.type;
    const value: number = effect.value;
    const duration: number = effect.duration ?? 1;
    const expire: 'start' | 'end' = effect.expire ?? 'start';
    let effectText = '';
    // Use dynamic color based on effect type
    let color = EffectEngine.getEffectColor(effectType);
    let feedbackPos = { x: 0, y: 0 };
    let feedbackLayer = context?.scene?.unitLayer;
    let result = false;
    switch (effectType) {
      case 'buff_ap':
        if (target) {
          // Do not stack if already exists from same source
          const sourceSpell = (effect as any).sourceSpell || (context && (context as any).sourceSpell) || (effect as any).spellName;
          const already = target.states.find(s => s.type === 'buff_ap' && s.source === sourceSpell);
          if (!already) {
            const state: State = {
              id: `buff_ap_${Date.now()}_${Math.random()}`,
              type: 'buff_ap',
              duration,
              value,
              expire,
              source: sourceSpell
            };
            target.applyState(state);
            effectText = `+${value} AP`;
            feedbackPos = EffectEngine.getTargetPos(target);
            result = true;
          }
        }
        break;
      case 'drain_ap':
        if (target) {
          target.loseAP(value);
          const state: State = {
            id: `ap_loss_${Date.now()}_${Math.random()}`,
            type: 'ap_loss',
            duration,
            value,
            expire
          };
          target.applyState(state);
          effectText = `-${value} AP`;
          feedbackPos = EffectEngine.getTargetPos(target);
          result = true;
        }
        break;
      case 'damage':
        if (target) {
          target.takeDamage(value);
          effectText = `-${value} HP`;
          feedbackPos = EffectEngine.getTargetPos(target);
          result = true;
        }
        break;
      case 'heal':
        if (target) {
          target.heal(value);
          effectText = `+${value} HP`;
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
            feedbackPos = { x: pos.x * 64 + 32, y: pos.y * 64 };
            result = true;
          }
        }
        break;
      // TODO: Add buffs, debuffs, area, etc.
      default:
        // If the effect does not apply (e.g., null target), just skip
        break;
    }
    // Only show feedback if the effect was applied and there is a valid target or position
    if (effectText && feedbackLayer && result) {
      FloatingText.show(feedbackLayer, effectText, feedbackPos.x, feedbackPos.y, color);
    }
    return result;
  }

  /**
   * Aplica todos los efectos de un hechizo, en orden.
   * Resta AP solo una vez por todo el hechizo, incluso si el efecto fue nulo.
   */
  static applySpell(
    spell: { effects: SpellEffectConfig[], cost: number },
    caster: Unit,
    target: Unit | null,
    context?: EffectContext
  ): boolean {
    // Restar AP una sola vez, aunque el efecto sea nulo
    if (spell.cost > 0) {
      if (caster.ap < spell.cost) return false;
      caster.ap -= spell.cost;
    }
    let anyEffect = false;
    for (const effect of spell.effects) {
      // Permitir target null si el hechizo lo permite
      const result = EffectEngine.applyEffect(effect, caster, target, context);
      anyEffect = anyEffect || result;
    }
    return anyEffect;
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