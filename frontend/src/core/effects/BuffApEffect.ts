// BuffApEffect.ts
// Handles AP buff application to target units

import { BaseEffect } from './Effect';
import type { Unit } from '../Unit';
import type { State } from '../Unit';
import type { EffectContext } from './Effect';

/**
 * Effect that applies an AP buff state to a target unit
 * Shows blue floating text feedback when buff is applied
 */
export class BuffApEffect extends BaseEffect {
  constructor(value: number, duration: number, sourceSpell?: string) {
    super(value, duration, sourceSpell);
  }

  /**
   * Apply AP buff to the target unit
   * @param caster The unit casting the spell
   * @param target The target unit to buff
   * @param context Additional context containing source spell information
   * @returns true if buff was applied, false if target is null or dead
   */
  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean {
    if (!target || !target.isAlive()) {
      return false;
    }

    // Do not stack if already exists from same source
    const sourceSpell = this.sourceSpell || context?.sourceSpell;
    const already = target.states.find(s => s.type === 'buff_ap' && s.source === sourceSpell);
    
    if (already) {
      return false;
    }

    // Create and apply the buff state
    const state: State = {
      id: `buff_ap_${Date.now()}_${Math.random()}`,
      type: 'buff_ap',
      duration: this.duration!,
      value: this.value,
      source: sourceSpell
    };
    
    target.applyState(state);
    
    // Apply AP bonus immediately if self-cast
    if (target.isSelf(caster) && this.value) {
      target.ap += this.value;
    }
    
    // Show blue floating text feedback
    this.showFeedback(`+${this.value} AP`, target, context, '#3a8fff');
    
    return true;
  }
} 