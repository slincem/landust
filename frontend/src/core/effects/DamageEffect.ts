// DamageEffect.ts
// Handles damage application to target units

import { BaseEffect } from './Effect';
import type { Unit } from '../Unit';
import type { EffectContext } from './Effect';

/**
 * Effect that applies damage to a target unit
 * Shows red floating text feedback when damage is dealt
 */
export class DamageEffect extends BaseEffect {
  constructor(value: number) {
    super(value);
  }

  /**
   * Apply damage to the target unit
   * @param caster The unit casting the spell
   * @param target The target unit to damage
   * @param context Additional context (unused for damage)
   * @returns true if damage was applied, false if target is null or dead
   */
  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean {
    if (!target || !target.isAlive()) {
      return false;
    }

    // Apply damage to target
    target.takeDamage(this.value);
    
    // Show red floating text feedback
    this.showFeedback(`-${this.value} HP`, target, context, '#ff4444');
    
    return true;
  }
} 