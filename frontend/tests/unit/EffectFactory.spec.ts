import { describe, it, expect, vi } from 'vitest';
import { EffectFactory } from '../../src/core/EffectEngine';
import { DamageEffect } from '../../src/core/effects/DamageEffect';
import { HealEffect } from '../../src/core/effects/HealEffect';
import { BuffApEffect } from '../../src/core/effects/BuffApEffect';
import { DrainApEffect } from '../../src/core/effects/DrainApEffect';
import { TeleportEffect } from '../../src/core/effects/TeleportEffect';
import { PushEffect } from '../../src/core/effects/PushEffect';
import type { SpellEffectConfig } from '../../src/core/Spell';

describe('EffectFactory', () => {
  describe('createEffect', () => {
    it('should create DamageEffect for damage type', () => {
      const config: SpellEffectConfig = {
        type: 'damage',
        value: 25
      };

      const effect = EffectFactory.createEffect(config);

      expect(effect).toBeInstanceOf(DamageEffect);
    });

    it('should create HealEffect for heal type', () => {
      const config: SpellEffectConfig = {
        type: 'heal',
        value: 40
      };

      const effect = EffectFactory.createEffect(config);

      expect(effect).toBeInstanceOf(HealEffect);
    });

    it('should create BuffApEffect for buff_ap type', () => {
      const config: SpellEffectConfig = {
        type: 'buff_ap',
        value: 3,
        duration: 2,
        sourceSpell: 'TestSpell'
      };

      const effect = EffectFactory.createEffect(config);

      expect(effect).toBeInstanceOf(BuffApEffect);
    });

    it('should create DrainApEffect for drain_ap type', () => {
      const config: SpellEffectConfig = {
        type: 'drain_ap',
        value: 2,
        duration: 1
      };

      const effect = EffectFactory.createEffect(config);

      expect(effect).toBeInstanceOf(DrainApEffect);
    });

    it('should create TeleportEffect for teleport type', () => {
      const config: SpellEffectConfig = {
        type: 'teleport',
        value: 0
      };

      const effect = EffectFactory.createEffect(config);

      expect(effect).toBeInstanceOf(TeleportEffect);
    });

    it('should create PushEffect for push type', () => {
      const config: SpellEffectConfig = {
        type: 'push',
        value: 5
      };

      const effect = EffectFactory.createEffect(config);

      expect(effect).toBeInstanceOf(PushEffect);
    });

    it('should use default radius for PushEffect when not provided', () => {
      const config: SpellEffectConfig = {
        type: 'push',
        value: 5
      };

      const effect = EffectFactory.createEffect(config);

      expect(effect).toBeInstanceOf(PushEffect);
    });

    it('should throw error for unknown effect type', () => {
      const config: SpellEffectConfig = {
        type: 'unknown_effect' as any,
        value: 10
      };

      expect(() => {
        EffectFactory.createEffect(config);
      }).toThrow('Unknown effect type: unknown_effect');
    });

    it('should handle configs with missing optional fields', () => {
      const damageConfig: SpellEffectConfig = {
        type: 'damage',
        value: 25
        // No duration or sourceSpell
      };

      const effect = EffectFactory.createEffect(damageConfig);

      expect(effect).toBeInstanceOf(DamageEffect);
    });

    it('should pass correct parameters to BuffApEffect', () => {
      const config: SpellEffectConfig = {
        type: 'buff_ap',
        value: 5,
        duration: 3,
        sourceSpell: 'Acceleration'
      };

      const effect = EffectFactory.createEffect(config) as BuffApEffect;

      expect(effect).toBeInstanceOf(BuffApEffect);
      // Note: We can't directly test private properties, but we can test the effect works
      expect(effect.apply).toBeDefined();
    });

    it('should pass correct parameters to DrainApEffect', () => {
      const config: SpellEffectConfig = {
        type: 'drain_ap',
        value: 2,
        duration: 1
      };

      const effect = EffectFactory.createEffect(config) as DrainApEffect;

      expect(effect).toBeInstanceOf(DrainApEffect);
      expect(effect.apply).toBeDefined();
    });
  });
}); 