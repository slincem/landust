// EffectEngine.ts
// Centralizes all effect application logic for spells using a decoupled effect system

import type { Unit } from './Unit';
import type { SpellEffectConfig } from './Spell';
import type { IEffect, EffectContext } from './effects';
import { DamageEffect, HealEffect, BuffApEffect, DrainApEffect, TeleportEffect, PushEffect }
  from './effects';


export type EffectType = 'damage' | 'heal' | 'teleport' | 'buff' | 'debuff' | 'drain_ap' | 'buff_ap' | 'push';

/**
 * Factory class for creating effect instances from configuration
 * Each effect type is mapped to its corresponding implementation class
 */
export class EffectFactory {
  /**
   * Create the appropriate effect instance from configuration
   * @param config The spell effect configuration
   * @returns An effect instance that implements IEffect
   * @throws Error if the effect type is unknown
   */
  static createEffect(config: SpellEffectConfig): IEffect {
    switch (config.type) {
      case 'damage':
        return new DamageEffect(config.value);
      case 'heal':
        return new HealEffect(config.value);
      case 'buff_ap':
        return new BuffApEffect(config.value, config.duration!, config.sourceSpell);
      case 'drain_ap':
        return new DrainApEffect(config.value, config.duration!);
      case 'teleport':
        return new TeleportEffect(config.value);
      case 'push':
        return new PushEffect(config.value, (config as any).radius || 1);
      // Future effect types can be added here:
      // case 'pull':
      //   return new PullEffect(config.value, config.radius);
      // case 'area_heal':
      //   return new AreaHealEffect(config.value, config.radius);
      // case 'swap':
      //   return new SwapEffect();
      default:
        throw new Error(`Unknown effect type: ${config.type}`);
    }
  }
}

export class EffectEngine {
  /**
   * Returns the color for a given effect type for floating feedback text.
   * This method is kept for backward compatibility but is now handled by individual effects.
   * @deprecated Use individual effect classes for color management
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
   * Apply a single effect using the decoupled effect system
   * @param config The spell effect configuration
   * @param caster The unit casting the spell
   * @param target The target unit (or null for cell effects)
   * @param context Additional context (map, scene, cellPosition, etc)
   * @returns true if the effect was applied, false otherwise
   */
  static applyEffect(
    config: SpellEffectConfig,
    caster: Unit,
    target: Unit | null,
    context?: EffectContext
  ): boolean {
    try {
      const effect = EffectFactory.createEffect(config);
      return effect.apply(caster, target, context);
    } catch (error) {
      console.error(`Failed to apply effect ${config.type}:`, error);
      return false;
    }
  }

  /**
   * Apply all effects of a spell, subtracting AP once
   * Maintains the same public API as before
   * @param spell The spell object containing effects and cost
   * @param caster The unit casting the spell
   * @param target The target unit (or null for cell effects)
   * @param context Additional context (map, scene, cellPosition, etc)
   * @returns true if any effect was applied, false otherwise
   */
  static applySpell(
    spell: { effects: SpellEffectConfig[]; cost: number },
    caster: Unit,
    target: Unit | null,
    context?: EffectContext
  ): boolean {
    // Subtract AP once, even if effects are null
    if (spell.cost > 0) {
      if (caster.ap < spell.cost) return false;
      caster.ap -= spell.cost;
    }

    let anyEffect = false;
    for (const effectConfig of spell.effects) {
      // Allow null target if the spell permits it
      const result = this.applyEffect(effectConfig, caster, target, context);
      anyEffect = anyEffect || result;
    }
    return anyEffect;
  }
} 