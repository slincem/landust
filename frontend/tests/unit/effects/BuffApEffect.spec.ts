import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuffApEffect } from '../../../src/core/effects/BuffApEffect';
import { Unit } from '../../../src/core/Unit';
import type { EffectContext } from '../../../src/core/effects/Effect';

describe('BuffApEffect', () => {
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
    it('should create effect with correct buff values', () => {
      const effect = new BuffApEffect(3, 2, 'TestSpell');
      expect(effect).toBeInstanceOf(BuffApEffect);
    });
  });

  describe('apply', () => {
    it('should apply AP buff state and show feedback', () => {
      const buffValue = 3;
      const duration = 2;
      const sourceSpell = 'TestSpell';
      const effect = new BuffApEffect(buffValue, duration, sourceSpell);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.states).toHaveLength(1);
      expect(target.states[0].type).toBe('buff_ap');
      expect(target.states[0].value).toBe(buffValue);
      expect(target.states[0].duration).toBe(duration);
      expect(target.states[0].source).toBe(sourceSpell);
    });

    it('should apply immediate AP bonus for self-cast', () => {
      const initialAP = caster.ap;
      const buffValue = 2;
      const effect = new BuffApEffect(buffValue, 3, 'SelfSpell');

      const result = effect.apply(caster, caster, context);

      expect(result).toBe(true);
      expect(caster.ap).toBe(initialAP + buffValue);
    });

    it('should not stack buffs from same source', () => {
      const sourceSpell = 'TestSpell';
      const effect1 = new BuffApEffect(3, 2, sourceSpell);
      const effect2 = new BuffApEffect(5, 3, sourceSpell);

      // Apply first buff
      const result1 = effect1.apply(caster, target, context);
      expect(result1).toBe(true);
      expect(target.states).toHaveLength(1);

      // Try to apply second buff from same source
      const result2 = effect2.apply(caster, target, context);
      expect(result2).toBe(false);
      expect(target.states).toHaveLength(1); // Should not add new state
    });

    it('should allow stacking buffs from different sources', () => {
      const effect1 = new BuffApEffect(3, 2, 'Spell1');
      const effect2 = new BuffApEffect(5, 3, 'Spell2');

      // Apply first buff
      const result1 = effect1.apply(caster, target, context);
      expect(result1).toBe(true);

      // Apply second buff from different source
      const result2 = effect2.apply(caster, target, context);
      expect(result2).toBe(true);
      expect(target.states).toHaveLength(2);
    });

    it('should return false when target is null', () => {
      const effect = new BuffApEffect(3, 2, 'TestSpell');
      const result = effect.apply(caster, null, context);
      
      expect(result).toBe(false);
    });

    it('should return false when target is dead', () => {
      target.hp = 0;
      const effect = new BuffApEffect(3, 2, 'TestSpell');
      const result = effect.apply(caster, target, context);
      
      expect(result).toBe(false);
    });

    it('should use sourceSpell from context if not provided in constructor', () => {
      const contextWithSource = {
        ...context,
        sourceSpell: 'ContextSpell'
      };
      const effect = new BuffApEffect(3, 2);

      const result = effect.apply(caster, target, contextWithSource);

      expect(result).toBe(true);
      expect(target.states[0].source).toBe('ContextSpell');
    });

    it('should handle zero buff value', () => {
      const effect = new BuffApEffect(0, 2, 'TestSpell');

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.states[0].value).toBe(0);
    });
  });
}); 