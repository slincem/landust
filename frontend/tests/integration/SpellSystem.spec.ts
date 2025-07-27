import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpellSystem } from '../../src/core/battle/SpellSystem';
import { Unit } from '../../src/core/Unit';
import { Spell } from '../../src/core/Spell';
import { TurnManager } from '../../src/core/TurnManager';
import { UnitClasses } from '../../src/core/unitClasses';

// Mock dependencies
vi.mock('../../src/ui/FloatingText', () => ({
  FloatingText: {
    show: vi.fn()
  }
}));

describe('SpellSystem Integration', () => {
  let spellSystem: SpellSystem;
  let caster: Unit;
  let target: Unit;
  let turnManager: TurnManager;
  let mockScene: any;
  let mockMap: any;

  beforeEach(() => {
    // Create test units using actual unit classes
    caster = new Unit('caster1', 'Timetac', 'player', { x: 0, y: 0 }, 1, UnitClasses.Timetac);
    target = new Unit('target1', 'Healium', 'enemy', { x: 1, y: 1 }, 2, UnitClasses.Healium);

    // Create turn manager
    turnManager = new TurnManager([caster, target]);

    // Create mock scene
    mockScene = {
      turnManager,
      updateTurnLabel: vi.fn(),
      updateUnitSprites: vi.fn(),
      handleUnitDeath: vi.fn(),
      createSpellBar: vi.fn(),
      updateReachableAndHighlights: vi.fn(),
      isMoving: false
    };

    // Create mock map
    mockMap = {
      isWalkable: vi.fn().mockReturnValue(true),
      isOccupied: vi.fn().mockReturnValue(false),
      setOccupied: vi.fn()
    };

    // Create spell system
    spellSystem = new SpellSystem(mockScene, mockMap);
  });

  describe('Acceleration spell integration', () => {
    it('should apply buff_ap state with correct duration', () => {
      // Get the Acceleration spell from Timetac class
      const accelerationSpell = caster.spells.find(s => s.name === 'Acceleration');
      expect(accelerationSpell).toBeDefined();

      // Set caster as current unit
      caster.selectedSpellIdx = caster.spells.indexOf(accelerationSpell!);
      expect(caster.selectedSpell).toBe(accelerationSpell);

      // Cast the spell
      const result = spellSystem.handleSpellCast(target);

      expect(result).toBe(true);
      expect(target.states).toHaveLength(1);
      expect(target.states[0].type).toBe('buff_ap');
      expect(target.states[0].value).toBe(2);
      expect(target.states[0].duration).toBe(3);
      expect(target.states[0].source).toBe('Acceleration');
    });

    it('should apply immediate AP bonus for self-cast', () => {
      const accelerationSpell = caster.spells.find(s => s.name === 'Acceleration');
      caster.selectedSpellIdx = caster.spells.indexOf(accelerationSpell!);

      const initialAP = caster.ap;
      const result = spellSystem.handleSpellCast(caster);

      expect(result).toBe(true);
      expect(caster.ap).toBe(initialAP + 2); // Should get immediate +2 AP
      expect(caster.states).toHaveLength(1);
      expect(caster.states[0].type).toBe('buff_ap');
    });

    it('should not stack buffs from same source', () => {
      const accelerationSpell = caster.spells.find(s => s.name === 'Acceleration');
      caster.selectedSpellIdx = caster.spells.indexOf(accelerationSpell!);

      // Cast first time
      const result1 = spellSystem.handleSpellCast(target);
      expect(result1).toBe(true);
      expect(target.states).toHaveLength(1);

      // Cast second time
      const result2 = spellSystem.handleSpellCast(target);
      expect(result2).toBe(false); // Should fail due to stacking prevention
      expect(target.states).toHaveLength(1); // Should not add new state
    });
  });

  describe('DrainTime spell integration', () => {
    it('should apply ap_loss state with correct duration', () => {
      const drainTimeSpell = caster.spells.find(s => s.name === 'DrainTime');
      expect(drainTimeSpell).toBeDefined();

      caster.selectedSpellIdx = caster.spells.indexOf(drainTimeSpell!);
      const initialAP = target.ap;

      const result = spellSystem.handleSpellCast(target);

      expect(result).toBe(true);
      expect(target.ap).toBe(initialAP - 2); // Should lose 2 AP immediately
      expect(target.states).toHaveLength(1);
      expect(target.states[0].type).toBe('ap_loss');
      expect(target.states[0].value).toBe(2);
      expect(target.states[0].duration).toBe(1);
    });
  });

  describe('state duration management', () => {
    it('should decrement state duration at end of turn', () => {
      // Apply Acceleration spell
      const accelerationSpell = caster.spells.find(s => s.name === 'Acceleration');
      caster.selectedSpellIdx = caster.spells.indexOf(accelerationSpell!);
      spellSystem.handleSpellCast(target);

      expect(target.states[0].duration).toBe(3);

      // End turn
      turnManager.endTurn();

      // State should be decremented
      expect(target.states[0].duration).toBe(2);
    });

    it('should remove expired states', () => {
      // Apply DrainTime spell (duration 1)
      const drainTimeSpell = caster.spells.find(s => s.name === 'DrainTime');
      caster.selectedSpellIdx = caster.spells.indexOf(drainTimeSpell!);
      spellSystem.handleSpellCast(target);

      expect(target.states).toHaveLength(1);
      expect(target.states[0].duration).toBe(1);

      // End turn
      turnManager.endTurn();

      // State should be removed
      expect(target.states).toHaveLength(0);
    });

    it('should restore AP when ap_loss expires', () => {
      // Apply DrainTime spell
      const drainTimeSpell = caster.spells.find(s => s.name === 'DrainTime');
      caster.selectedSpellIdx = caster.spells.indexOf(drainTimeSpell!);
      spellSystem.handleSpellCast(target);

      expect(target.ap).toBe(target.maxAP - 2); // Should have lost AP

      // End turn to expire the state
      turnManager.endTurn();

      // AP should be restored
      expect(target.ap).toBe(target.maxAP);
    });
  });

  describe('spell casting validation', () => {
    it('should validate AP cost before casting', () => {
      const accelerationSpell = caster.spells.find(s => s.name === 'Acceleration');
      caster.selectedSpellIdx = caster.spells.indexOf(accelerationSpell!);

      // Drain AP
      caster.ap = 1; // Less than spell cost (2)

      const result = spellSystem.handleSpellCast(target);

      expect(result).toBe(false);
      expect(target.states).toHaveLength(0); // Should not apply effect
    });

    it('should validate target is alive', () => {
      const accelerationSpell = caster.spells.find(s => s.name === 'Acceleration');
      caster.selectedSpellIdx = caster.spells.indexOf(accelerationSpell!);

      // Kill target
      target.hp = 0;

      const result = spellSystem.handleSpellCast(target);

      expect(result).toBe(false);
      expect(target.states).toHaveLength(0); // Should not apply effect
    });

    it('should handle cooldown restrictions', () => {
      const accelerationSpell = caster.spells.find(s => s.name === 'Acceleration');
      caster.selectedSpellIdx = caster.spells.indexOf(accelerationSpell!);

      // Set cooldown
      accelerationSpell!.cooldownCounter = 2;

      const result = spellSystem.handleSpellCast(target);

      expect(result).toBe(false);
      expect(target.states).toHaveLength(0); // Should not apply effect
    });
  });

  describe('spell effects integration', () => {
    it('should apply multiple effects from a spell', () => {
      // Create a custom spell with multiple effects
      const multiEffectSpell = new Spell({
        name: 'MultiEffect',
        cost: 4,
        range: 3,
        minRange: 1,
        maxCastsPerTurn: 1,
        targetType: 'enemy',
        effects: [
          { type: 'damage', value: 20 },
          { type: 'drain_ap', value: 1, duration: 2 }
        ]
      });

      caster.spells.push(multiEffectSpell);
      caster.selectedSpellIdx = caster.spells.length - 1;

      const initialHP = target.hp;
      const initialAP = target.ap;

      const result = spellSystem.handleSpellCast(target);

      expect(result).toBe(true);
      expect(target.hp).toBe(initialHP - 20); // Should take damage
      expect(target.ap).toBe(initialAP - 1); // Should lose AP
      expect(target.states).toHaveLength(1); // Should have ap_loss state
      expect(target.states[0].type).toBe('ap_loss');
    });
  });
}); 