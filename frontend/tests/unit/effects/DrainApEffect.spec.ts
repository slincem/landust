import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrainApEffect } from '../../../src/core/effects/DrainApEffect';
import { Unit } from '../../../src/core/Unit';
import type { EffectContext } from '../../../src/core/effects/Effect';

describe('DrainApEffect', () => {
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
    it('should create effect with correct drain values', () => {
      const effect = new DrainApEffect(2, 3);
      expect(effect).toBeInstanceOf(DrainApEffect);
    });
  });

  describe('apply', () => {
    it('should apply AP drain and state, then show feedback', () => {
      const initialAP = target.ap;
      const drainValue = 2;
      const duration = 3;
      const effect = new DrainApEffect(drainValue, duration);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.ap).toBe(initialAP - drainValue);
      expect(target.states).toHaveLength(1);
      expect(target.states[0].type).toBe('ap_loss');
      expect(target.states[0].value).toBe(drainValue);
      expect(target.states[0].duration).toBe(duration);
    });

    it('should not reduce AP below 0', () => {
      target.ap = 1; // Only 1 AP left
      const drainValue = 5;
      const effect = new DrainApEffect(drainValue, 2);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.ap).toBe(0); // Should not go below 0
      expect(target.states).toHaveLength(1);
    });

    it('should return false when target is null', () => {
      const effect = new DrainApEffect(2, 3);
      const result = effect.apply(caster, null, context);
      
      expect(result).toBe(false);
    });

    it('should return false when target is dead', () => {
      target.hp = 0;
      const effect = new DrainApEffect(2, 3);
      const result = effect.apply(caster, target, context);
      
      expect(result).toBe(false);
    });

    it('should handle zero drain value', () => {
      const initialAP = target.ap;
      const effect = new DrainApEffect(0, 2);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.ap).toBe(initialAP); // Should not change
      expect(target.states).toHaveLength(1);
      expect(target.states[0].value).toBe(0);
    });

    it('should create unique state ID', () => {
      const effect1 = new DrainApEffect(2, 3);
      const effect2 = new DrainApEffect(3, 2);

      effect1.apply(caster, target, context);
      effect2.apply(caster, target, context);

      expect(target.states).toHaveLength(2);
      expect(target.states[0].id).not.toBe(target.states[1].id);
    });

    it('should not show feedback when scene is not available', () => {
      const effect = new DrainApEffect(2, 3);
      const contextWithoutScene = {};

      const result = effect.apply(caster, target, contextWithoutScene);

      expect(result).toBe(true);
    });
  });
}); 