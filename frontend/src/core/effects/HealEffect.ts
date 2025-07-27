// HealEffect.ts
// Handles healing application to target units

import { BaseEffect } from './Effect';
import type { Unit } from '../Unit';
import type { EffectContext } from './Effect';

/**
 * Effect that applies healing to a target unit
 * Shows green floating text feedback when healing is applied
 */
export class HealEffect extends BaseEffect {
  constructor(value: number) {
    super(value);
  }

  /**
   * Apply healing to the target unit
   * @param caster The unit casting the spell
   * @param target The target unit to heal
   * @param context Additional context (unused for healing)
   * @returns true if healing was applied, false if target is null or dead
   */
  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean {
    if (!target || !target.isAlive()) {
      return false;
    }

    // Apply healing to target
    target.heal(this.value);
    
    // Show green floating text feedback
    this.showFeedback(`+${this.value} HP`, target, context, '#3ecf4a');
    
    return true;
  }
} 