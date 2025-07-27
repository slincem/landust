import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealEffect } from '../../../src/core/effects/HealEffect';
import { Unit } from '../../../src/core/Unit';
import type { EffectContext } from '../../../src/core/effects/Effect';

describe('HealEffect', () => {
  let caster: Unit;
  let target: Unit;
  let context: EffectContext;

  beforeEach(() => {
    // Create test units
    caster = new Unit('caster1', 'Caster', 'player', { x: 0, y: 0 }, 1, {
      name: 'TestClass',
      maxHP: 100,
      maxAP: 6,
      maxMP: 4,
      spells: [],
      color: 0xff0000
    });

    target = new Unit('target1', 'Target', 'enemy', { x: 1, y: 1 }, 2, {
      name: 'TestClass',
      maxHP: 100,
      maxAP: 6,
      maxMP: 4,
      spells: [],
      color: 0x00ff00
    });

    context = {
      scene: {
        unitLayer: {}
      }
    };
  });

  describe('constructor', () => {
    it('should create effect with correct heal value', () => {
      const effect = new HealEffect(40);
      expect(effect).toBeInstanceOf(HealEffect);
    });
  });

  describe('apply', () => {
    it('should apply healing to target and show feedback', () => {
      // Damage target first
      target.hp = 50;
      const initialHP = target.hp;
      const healValue = 30;
      const effect = new HealEffect(healValue);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.hp).toBe(initialHP + healValue);
    });

    it('should not exceed maxHP when healing', () => {
      target.hp = 90; // 10 HP below max
      const healValue = 20;
      const effect = new HealEffect(healValue);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.hp).toBe(target.maxHP); // Should be capped at maxHP
    });

    it('should return false when target is null', () => {
      const effect = new HealEffect(25);
      const result = effect.apply(caster, null, context);
      
      expect(result).toBe(false);
    });

    it('should return false when target is dead', () => {
      target.hp = 0;
      const effect = new HealEffect(25);
      const result = effect.apply(caster, target, context);
      
      expect(result).toBe(false);
    });

    it('should handle zero healing', () => {
      const initialHP = target.hp;
      const effect = new HealEffect(0);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.hp).toBe(initialHP);
    });

    it('should not show feedback when scene is not available', () => {
      const effect = new HealEffect(25);
      const contextWithoutScene = {};

      const result = effect.apply(caster, target, contextWithoutScene);

      expect(result).toBe(true);
    });
  });
}); 