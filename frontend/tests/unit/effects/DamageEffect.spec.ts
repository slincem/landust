import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DamageEffect } from '../../../src/core/effects/DamageEffect';
import { Unit } from '../../../src/core/Unit';
import type { EffectContext } from '../../../src/core/effects/Effect';

describe('DamageEffect', () => {
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
    it('should create effect with correct damage value', () => {
      const effect = new DamageEffect(25);
      expect(effect).toBeInstanceOf(DamageEffect);
    });
  });

  describe('apply', () => {
    it('should apply damage to target and show feedback', () => {
      const initialHP = target.hp;
      const damageValue = 30;
      const effect = new DamageEffect(damageValue);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.hp).toBe(initialHP - damageValue);
    });

    it('should return false when target is null', () => {
      const effect = new DamageEffect(25);
      const result = effect.apply(caster, null, context);
      
      expect(result).toBe(false);
    });

    it('should return false when target is dead', () => {
      target.hp = 0;
      const effect = new DamageEffect(25);
      const result = effect.apply(caster, target, context);
      
      expect(result).toBe(false);
    });

    it('should handle zero damage', () => {
      const initialHP = target.hp;
      const effect = new DamageEffect(0);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.hp).toBe(initialHP);
    });

    it('should not show feedback when scene is not available', () => {
      const effect = new DamageEffect(25);
      const contextWithoutScene = {};

      const result = effect.apply(caster, target, contextWithoutScene);

      expect(result).toBe(true);
    });
  });
}); 