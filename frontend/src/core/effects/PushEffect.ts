// PushEffect.ts
// Handles pushing target units away from the caster

import { BaseEffect } from './Effect';
import type { Unit } from '../Unit';
import type { EffectContext } from './Effect';

/**
 * Effect that pushes a target unit away from the caster
 * Shows orange floating text feedback when push occurs
 * This is an example of how to add new effect types to the system
 */
export class PushEffect extends BaseEffect {
  private radius: number;

  constructor(value: number, radius: number = 1) {
    super(value);
    this.radius = radius;
  }

  /**
   * Push the target unit away from the caster
   * @param caster The unit casting the spell
   * @param target The target unit to push
   * @param context Additional context containing map information
   * @returns true if push was successful, false otherwise
   */
  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean {
    if (!target || !target.isAlive() || !context?.map) {
      return false;
    }

    // Calculate push direction (away from caster)
    const dx = target.position.x - caster.position.x;
    const dy = target.position.y - caster.position.y;
    
    // Normalize direction
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) {
      return false; // Can't push if on same position
    }

    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    // Calculate new position
    const newX = Math.round(target.position.x + normalizedDx * this.radius);
    const newY = Math.round(target.position.y + normalizedDy * this.radius);
    const newPos = { x: newX, y: newY };

    // Check if new position is valid
    if (!context.map.isWalkable(newPos) || context.map.isOccupied(newPos)) {
      return false;
    }

    // Move the target
    context.map.setOccupied(target.position, null);
    target.position = newPos;
    context.map.setOccupied(newPos, target);

    // Update visual representation if scene is available
    if (context.scene && typeof context.scene.updateUnitSprites === 'function') {
      context.scene.updateUnitSprites();
    }

    // Show orange floating text feedback
    this.showFeedback('Push!', target, context, '#ff8c00');
    
    return true;
  }
} 