// TeleportEffect.ts
// Handles teleportation of the caster to a target position

import { BaseEffect } from './Effect';
import type { Unit } from '../Unit';
import type { EffectContext } from './Effect';

/**
 * Effect that teleports the caster to a target position
 * Shows yellow floating text feedback when teleportation occurs
 */
export class TeleportEffect extends BaseEffect {
  constructor(value: number) {
    super(value);
  }

  /**
   * Teleport the caster to the target position
   * @param caster The unit casting the spell (will be teleported)
   * @param target The target unit (unused for teleport)
   * @param context Additional context containing map and cell position
   * @returns true if teleportation was successful, false otherwise
   */
  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean {
    if (!context?.map || !context?.cellPosition) {
      return false;
    }

    const pos = context.cellPosition;
    
    // Check if the target position is walkable and unoccupied
    if (!context.map.isWalkable(pos) || context.map.isOccupied(pos)) {
      return false;
    }

    // Update map occupancy and caster position
    context.map.setOccupied(caster.position, null);
    caster.position = { ...pos };
    context.map.setOccupied(pos, caster);
    
    // Update visual representation if scene is available
    if (context.scene && typeof context.scene.updateUnitSprites === 'function') {
      context.scene.updateUnitSprites();
    }
    
    // Show yellow floating text feedback
    this.showFeedback('Teleport!', null, context, '#f1c40f');
    
    return true;
  }
} 