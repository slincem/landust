import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TurnManager } from '../../src/core/TurnManager';
import { Unit } from '../../src/core/Unit';

describe('TurnManager', () => {
  let units: Unit[];
  let turnManager: TurnManager;

  beforeEach(() => {
    // Create test units
    units = [
      new Unit('unit1', 'Unit 1', 'player', { x: 0, y: 0 }, 1, {
        name: 'TestClass',
        maxHP: 100,
        maxAP: 6,
        maxMP: 4,
        spells: [],
        color: 0xff0000
      }),
      new Unit('unit2', 'Unit 2', 'enemy', { x: 1, y: 1 }, 2, {
        name: 'TestClass',
        maxHP: 100,
        maxAP: 6,
        maxMP: 4,
        spells: [],
        color: 0x00ff00
      }),
      new Unit('unit3', 'Unit 3', 'player', { x: 2, y: 2 }, 1, {
        name: 'TestClass',
        maxHP: 100,
        maxAP: 6,
        maxMP: 4,
        spells: [],
        color: 0x0000ff
      })
    ];

    turnManager = new TurnManager(units);
  });

  describe('constructor', () => {
    it('should initialize with units and start first turn', () => {
      expect(turnManager.getCurrentUnit()).toBe(units[0]);
    });

    it('should handle empty units array', () => {
      const emptyTurnManager = new TurnManager([]);
      expect(emptyTurnManager.getCurrentUnit()).toBeNull();
    });
  });

  describe('getCurrentUnit', () => {
    it('should return the current unit', () => {
      expect(turnManager.getCurrentUnit()).toBe(units[0]);
    });

    it('should skip dead units', () => {
      units[0].hp = 0; // Kill first unit
      expect(turnManager.getCurrentUnit()).toBe(units[1]);
    });

    it('should return null when all units are dead', () => {
      units.forEach(unit => unit.hp = 0);
      expect(turnManager.getCurrentUnit()).toBeNull();
    });

    it('should loop back to first alive unit', () => {
      units[0].hp = 0; // Kill first unit
      units[1].hp = 0; // Kill second unit
      expect(turnManager.getCurrentUnit()).toBe(units[2]);
    });
  });

  describe('startTurn', () => {
    it('should start turn for current unit', () => {
      const currentUnit = turnManager.getCurrentUnit();
      const initialAP = currentUnit!.ap;
      const initialMP = currentUnit!.mp;

      turnManager.startTurn();

      // Should restore AP and MP
      expect(currentUnit!.ap).toBe(currentUnit!.maxAP);
      expect(currentUnit!.mp).toBe(currentUnit!.maxMP);
    });

    it('should skip dead units when starting turn', () => {
      units[0].hp = 0; // Kill first unit
      turnManager.startTurn();

      expect(turnManager.getCurrentUnit()).toBe(units[1]);
    });

    it('should handle all units being dead', () => {
      units.forEach(unit => unit.hp = 0);
      turnManager.startTurn();

      expect(turnManager.getCurrentUnit()).toBeNull();
    });
  });

  describe('endTurn', () => {
    it('should end current turn and advance to next unit', () => {
      const firstUnit = turnManager.getCurrentUnit();
      expect(firstUnit).toBe(units[0]);

      turnManager.endTurn();

      const secondUnit = turnManager.getCurrentUnit();
      expect(secondUnit).toBe(units[1]);
    });

    it('should skip dead units when ending turn', () => {
      units[1].hp = 0; // Kill second unit
      turnManager.endTurn();

      expect(turnManager.getCurrentUnit()).toBe(units[2]);
    });

    it('should loop back to first unit after last unit', () => {
      // Advance to last unit
      turnManager.endTurn(); // unit1 -> unit2
      turnManager.endTurn(); // unit2 -> unit3

      expect(turnManager.getCurrentUnit()).toBe(units[2]);

      turnManager.endTurn(); // unit3 -> unit1 (loop)

      expect(turnManager.getCurrentUnit()).toBe(units[0]);
    });

    it('should handle all units being dead', () => {
      units.forEach(unit => unit.hp = 0);
      turnManager.endTurn();

      expect(turnManager.getCurrentUnit()).toBeNull();
    });
  });

  describe('state management', () => {
    it('should update states at end of turn', () => {
      const currentUnit = turnManager.getCurrentUnit()!;
      
      // Add a state to the current unit
      currentUnit.applyState({
        id: 'test_state',
        type: 'buff_ap',
        duration: 2,
        value: 3
      });

      expect(currentUnit.states).toHaveLength(1);
      expect(currentUnit.states[0].duration).toBe(2);

      turnManager.endTurn();

      // State should be decremented
      expect(currentUnit.states[0].duration).toBe(1);
    });

    it('should remove expired states', () => {
      const currentUnit = turnManager.getCurrentUnit()!;
      
      // Add a state with duration 1
      currentUnit.applyState({
        id: 'test_state',
        type: 'buff_ap',
        duration: 1,
        value: 3
      });

      expect(currentUnit.states).toHaveLength(1);

      turnManager.endTurn();

      // State should be removed
      expect(currentUnit.states).toHaveLength(0);
    });

    it('should not restore AP when ap_loss state is active', () => {
      const currentUnit = turnManager.getCurrentUnit()!;
      
      // Add ap_loss state
      currentUnit.applyState({
        id: 'ap_loss',
        type: 'ap_loss',
        duration: 2,
        value: 2
      });

      currentUnit.ap = 0; // Drain AP
      expect(currentUnit.ap).toBe(0);

      turnManager.startTurn();

      // Should not restore AP due to ap_loss state
      expect(currentUnit.ap).toBe(0);
    });
  });

  describe('cooldown management', () => {
    it('should decrement spell cooldowns at end of turn', () => {
      const currentUnit = turnManager.getCurrentUnit()!;
      
      // Add a spell with cooldown
      const spell = {
        name: 'TestSpell',
        cost: 3,
        range: 3,
        minRange: 1,
        maxCastsPerTurn: 1,
        targetType: 'enemy',
        effects: [{ type: 'damage', value: 25 }],
        cooldown: 3,
        cooldownCounter: 3
      };
      
      currentUnit.spells.push(spell as any);
      expect(spell.cooldownCounter).toBe(3);

      turnManager.endTurn();

      // Cooldown should be decremented
      expect(spell.cooldownCounter).toBe(2);
    });
  });
}); 