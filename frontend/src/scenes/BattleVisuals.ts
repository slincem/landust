// BattleVisuals.ts
// Centralizes all visual logic for highlighting, tinting, and feedback in the battle scene.
// This class is pure and decoupled from game rules. All color values are centralized.

import type { Graphics, Sprite } from 'pixi.js';
import type { Position } from '@core/Grid';
import type { EffectType } from '@core/EffectEngine';
import type { Unit } from '@core/Unit';

/**
 * Semantic color constants for effect types.
 */
export const EffectColors: Record<EffectType | 'default', number> = {
  damage: 0xff4444,      // Red
  heal: 0x3ecf4a,        // Green
  buff_ap: 0x3a8fff,     // Light blue
  drain_ap: 0x6a5acd,    // Purple
  teleport: 0xf1c40f,    // Yellow
  buff: 0x7ed957,        // Soft green (generic buff)
  debuff: 0xb97a56,      // Brownish (generic debuff)
  default: 0xffffff      // White (no tint)
};

export class BattleVisuals {
  /**
   * Returns the tint color for a given effect type for target highlighting.
   * Easily extensible for new effect types.
   */
  static getTargetTint(effectType: EffectType | undefined): number {
    if (!effectType) return EffectColors.default;
    return EffectColors[effectType] ?? EffectColors.default;
  }

  /**
   * Highlights a single cell with the specified color and opacity.
   * Uses only modern Pixi v8 APIs (no deprecated methods),
   * and guarantees that the full 64×64 area is painted every time.
   */
  static highlightTargetCell(
    layer: Graphics,
    pos: Position,
    color: number,
    alpha: number = 0.32
  ): void {
    // 1) Start a fresh path
    layer.beginPath();

    // 2) Define the rectangle for this cell
    layer.rect(
      pos.x * 64,
      pos.y * 64,
      64,
      64
    );

    // 3) Fill that rectangle with the given color & alpha
    layer.fill({ color, alpha });

    // 4) Close the path to finalize drawing for this cell
    layer.closePath();
  }

  /**
   * Applies a tint to a unit's sprite for visual feedback.
   */
  static highlightUnitSprite(sprite: Sprite, color: number): void {
    sprite.tint = color;
  }

  /**
   * Resets all unit sprite tints to their default state,
   * highlighting the active unit if needed.
   *
   * @param units List of all units
   * @param unitSprites Map of unit.id to Sprite
   * @param activeUnitId The id of the currently active unit
   */
  static resetAllUnitSpriteTints(
    units: Unit[],
    unitSprites: Map<string, Sprite>,
    activeUnitId: string
  ): void {
    for (const unit of units) {
      const sprite = unitSprites.get(unit.id);
      if (!sprite) continue;
      sprite.tint = unit.id === activeUnitId
        ? EffectColors.default
        : 0xcccccc;
      sprite.alpha = unit.id === activeUnitId ? 1 : 0.7;
    }
  }
}
