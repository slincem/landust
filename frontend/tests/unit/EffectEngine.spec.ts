import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EffectEngine } from '../../src/core/EffectEngine';
import { Unit } from '../../src/core/Unit';
import { Spell } from '../../src/core/Spell';
import type { SpellEffectConfig } from '../../src/core/Spell';

// Mock the effects to avoid complex dependencies
vi.mock('../../src/core/effects/DamageEffect', () => ({
  DamageEffect: vi.fn().mockImplementation(() => ({
    apply: vi.fn().mockReturnValue(true)
  }))
}));

vi.mock('../../src/core/effects/HealEffect', () => ({
  HealEffect: vi.fn().mockImplementation(() => ({
    apply: vi.fn().mockReturnValue(true)
  }))
}));

describe('EffectEngine', () => {
  let caster: Unit;
  let target: Unit;
  let spell: Spell;

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

    // Create test spell
    spell = new Spell({
      name: 'TestSpell',
      cost: 3,
      range: 3,
      minRange: 1,
      maxCastsPerTurn: 1,
      targetType: 'enemy',
      effects: [
        { type: 'damage', value: 25 },
        { type: 'heal', value: 10 }
      ]
    });

    vi.clearAllMocks();
  });

  describe('getEffectColor', () => {
    it('should return correct colors for different effect types', () => {
      expect(EffectEngine.getEffectColor('damage')).toBe('#ff4444');
      expect(EffectEngine.getEffectColor('heal')).toBe('#3ecf4a');
      expect(EffectEngine.getEffectColor('buff_ap')).toBe('#3a8fff');
      expect(EffectEngine.getEffectColor('drain_ap')).toBe('#6a5acd');
      expect(EffectEngine.getEffectColor('teleport')).toBe('#f1c40f');
    });

    it('should return default color for unknown effect types', () => {
      expect(EffectEngine.getEffectColor('unknown' as any)).toBe('#ff4444');
    });
  });

  describe('applyEffect', () => {
    it('should apply single effect successfully', () => {
      const config: SpellEffectConfig = {
        type: 'damage',
        value: 25
      };

      const result = EffectEngine.applyEffect(config, caster, target);

      expect(result).toBe(true);
    });

    it('should handle effect application failure', () => {
      // Mock the DamageEffect to return false
      const { DamageEffect } = require('../../src/core/effects/DamageEffect');
      DamageEffect.mockImplementation(() => ({
        apply: vi.fn().mockReturnValue(false)
      }));

      const config: SpellEffectConfig = {
        type: 'damage',
        value: 25
      };

      const result = EffectEngine.applyEffect(config, caster, target);

      expect(result).toBe(false);
    });

    it('should handle unknown effect types gracefully', () => {
      const config: SpellEffectConfig = {
        type: 'unknown_effect' as any,
        value: 25
      };

      const result = EffectEngine.applyEffect(config, caster, target);

      expect(result).toBe(false);
    });
  });

  describe('applySpell', () => {
    it('should subtract AP exactly once and apply all effects', () => {
      const initialAP = caster.ap;
      const spellObj = {
        effects: spell.effects,
        cost: spell.cost
      };

      const result = EffectEngine.applySpell(spellObj, caster, target);

      expect(result).toBe(true);
      expect(caster.ap).toBe(initialAP - spell.cost);
    });

    it('should return false when caster has insufficient AP', () => {
      caster.ap = 1; // Less than spell cost (3)
      const spellObj = {
        effects: spell.effects,
        cost: spell.cost
      };

      const result = EffectEngine.applySpell(spellObj, caster, target);

      expect(result).toBe(false);
      expect(caster.ap).toBe(1); // Should not change
    });

    it('should handle spells with zero cost', () => {
      const spellObj = {
        effects: spell.effects,
        cost: 0
      };
      const initialAP = caster.ap;

      const result = EffectEngine.applySpell(spellObj, caster, target);

      expect(result).toBe(true);
      expect(caster.ap).toBe(initialAP); // Should not change
    });

    it('should apply effects in order', () => {
      const spellObj = {
        effects: [
          { type: 'damage' as const, value: 25 },
          { type: 'heal' as const, value: 10 }
        ],
        cost: 3
      };

      const result = EffectEngine.applySpell(spellObj, caster, target);

      expect(result).toBe(true);
      // Both effects should have been applied
      const { DamageEffect } = require('../../src/core/effects/DamageEffect');
      const { HealEffect } = require('../../src/core/effects/HealEffect');
      expect(DamageEffect).toHaveBeenCalled();
      expect(HealEffect).toHaveBeenCalled();
    });

    it('should return true if any effect was applied', () => {
      // Mock first effect to fail, second to succeed
      const { DamageEffect } = require('../../src/core/effects/DamageEffect');
      const { HealEffect } = require('../../src/core/effects/HealEffect');
      DamageEffect.mockImplementation(() => ({
        apply: vi.fn().mockReturnValue(false)
      }));
      HealEffect.mockImplementation(() => ({
        apply: vi.fn().mockReturnValue(true)
      }));

      const spellObj = {
        effects: [
          { type: 'damage' as const, value: 25 },
          { type: 'heal' as const, value: 10 }
        ],
        cost: 3
      };

      const result = EffectEngine.applySpell(spellObj, caster, target);

      expect(result).toBe(true); // Should return true because at least one effect succeeded
    });

    it('should return false if no effects were applied', () => {
      // Mock both effects to fail
      const { DamageEffect } = require('../../src/core/effects/DamageEffect');
      const { HealEffect } = require('../../src/core/effects/HealEffect');
      DamageEffect.mockImplementation(() => ({
        apply: vi.fn().mockReturnValue(false)
      }));
      HealEffect.mockImplementation(() => ({
        apply: vi.fn().mockReturnValue(false)
      }));

      const spellObj = {
        effects: [
          { type: 'damage' as const, value: 25 },
          { type: 'heal' as const, value: 10 }
        ],
        cost: 3
      };

      const result = EffectEngine.applySpell(spellObj, caster, target);

      expect(result).toBe(false); // Should return false because no effects succeeded
    });

    it('should handle empty effects array', () => {
      const spellObj = {
        effects: [],
        cost: 3
      };

      const result = EffectEngine.applySpell(spellObj, caster, target);

      expect(result).toBe(false);
    });
  });
}); 