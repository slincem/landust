// DrainApEffect.ts
// Handles AP drain application to target units

import { BaseEffect } from './Effect';
import type { Unit } from '../Unit';
import type { State } from '../Unit';
import type { EffectContext } from './Effect';

/**
 * Effect that applies an AP drain state to a target unit
 * Shows purple floating text feedback when drain is applied
 */
export class DrainApEffect extends BaseEffect {
  constructor(value: number, duration: number) {
    super(value, duration);
  }

  /**
   * Apply AP drain to the target unit
   * @param caster The unit casting the spell
   * @param target The target unit to drain
   * @param context Additional context (unused for drain)
   * @returns true if drain was applied, false if target is null or dead
   */
  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean {
    if (!target || !target.isAlive()) {
      return false;
    }

    // Apply immediate AP loss
    target.loseAP(this.value);
    
    // Create and apply the drain state
    const state: State = {
      id: `ap_loss_${Date.now()}_${Math.random()}`,
      type: 'ap_loss',
      duration: this.duration!,
      value: this.value
    };
    
    target.applyState(state);
    
    // Show purple floating text feedback
    this.showFeedback(`-${this.value} AP`, target, context, '#6a5acd');
    
    return true;
  }
} 