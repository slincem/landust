// Effect.ts
// Base interface and types for the decoupled effect system

import type { Unit } from '../Unit';
import type { Position } from '../Unit';
import { FloatingText } from '../../ui/FloatingText';

/**
 * Context object passed to effects for additional information
 * Extensible for future effect types that need map, scene, or position data
 */
export interface EffectContext {
  map?: any;
  scene?: any;
  cellPosition?: Position;
  sourceSpell?: string;
}

/**
 * Base interface for all effect implementations
 * Each effect class must implement this interface to be used by the EffectEngine
 */
export interface IEffect {
  /**
   * Apply the effect to the target unit or position
   * @param caster The unit casting the spell
   * @param target The target unit (or null for cell effects)
   * @param context Additional context (map, scene, cellPosition, etc)
   * @returns true if the effect was applied successfully, false otherwise
   */
  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean;
}

/**
 * Base class for effects that need to show floating text feedback
 * Provides common functionality for visual feedback
 */
export abstract class BaseEffect implements IEffect {
  protected value: number;
  protected duration?: number;
  protected sourceSpell?: string;

  constructor(value: number, duration?: number, sourceSpell?: string) {
    this.value = value;
    this.duration = duration;
    this.sourceSpell = sourceSpell;
  }

  abstract apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean;

  /**
   * Show floating text feedback for the effect
   * @param text The text to display
   * @param target The target unit for positioning
   * @param context Context containing scene information
   * @param color The color of the text
   */
  protected showFeedback(text: string, target: Unit | null, context?: EffectContext, color?: string): void {
    if (!context?.scene?.unitLayer) return;

    const feedbackPos = this.getFeedbackPosition(target, context);
    if (feedbackPos) {
      FloatingText.show(context.scene.unitLayer, text, feedbackPos.x, feedbackPos.y, color || '#ff4444');
    }
  }

  /**
   * Get the position for floating text feedback
   * @param target The target unit
   * @param context Context containing map and position information
   * @returns Position coordinates for feedback text
   */
  private getFeedbackPosition(target: Unit | null, context?: EffectContext): { x: number, y: number } | null {
    if (target) {
      // Use target unit position
      const sprite = (target as any).sprite || (target as any).getSprite?.();
      if (sprite) {
        return { x: sprite.x, y: sprite.y - 32 };
      } else if (target.position) {
        return { x: target.position.x * 64 + 32, y: target.position.y * 64 };
      }
    } else if (context?.cellPosition) {
      // Use cell position for area/cell effects
      return { x: context.cellPosition.x * 64 + 32, y: context.cellPosition.y * 64 };
    }
    return null;
  }
} 