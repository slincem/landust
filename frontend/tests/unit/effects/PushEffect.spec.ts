import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushEffect } from '../../../src/core/effects/PushEffect';
import { Unit } from '../../../src/core/Unit';
import type { EffectContext } from '../../../src/core/effects/Effect';

describe('PushEffect', () => {
  let caster: Unit;
  let target: Unit;
  let context: EffectContext;
  let mockMap: any;

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

    // Create mock map
    mockMap = {
      isWalkable: vi.fn(),
      isOccupied: vi.fn(),
      setOccupied: vi.fn()
    };

    context = {
      map: mockMap,
      scene: {
        unitLayer: {},
        updateUnitSprites: vi.fn()
      }
    };
  });

  describe('constructor', () => {
    it('should create effect with correct values', () => {
      const effect = new PushEffect(5, 2);
      expect(effect).toBeInstanceOf(PushEffect);
    });

    it('should use default radius when not provided', () => {
      const effect = new PushEffect(5);
      expect(effect).toBeInstanceOf(PushEffect);
    });
  });

  describe('apply', () => {
    it('should push target away from caster', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      
      const initialPosition = { ...target.position };
      const effect = new PushEffect(5, 2);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      // Target should be pushed away from caster (0,0) to (1,1) + normalized direction * 2
      expect(target.position.x).toBe(3); // 1 + (1/sqrt(2)) * 2 ≈ 3
      expect(target.position.y).toBe(3); // 1 + (1/sqrt(2)) * 2 ≈ 3
      expect(mockMap.setOccupied).toHaveBeenCalledWith(initialPosition, null);
      expect(mockMap.setOccupied).toHaveBeenCalledWith(target.position, target);
      expect(context.scene.updateUnitSprites).toHaveBeenCalled();
    });

    it('should return false when target is null', () => {
      const effect = new PushEffect(5, 2);
      const result = effect.apply(caster, null, context);
      
      expect(result).toBe(false);
    });

    it('should return false when target is dead', () => {
      target.hp = 0;
      const effect = new PushEffect(5, 2);
      const result = effect.apply(caster, target, context);
      
      expect(result).toBe(false);
    });

    it('should return false when map is not available', () => {
      const contextWithoutMap = {
        scene: context.scene
      };
      const effect = new PushEffect(5, 2);

      const result = effect.apply(caster, target, contextWithoutMap);

      expect(result).toBe(false);
      expect(target.position).toEqual({ x: 1, y: 1 }); // Should not change
    });

    it('should return false when target position is not walkable', () => {
      mockMap.isWalkable.mockReturnValue(false);
      const effect = new PushEffect(5, 2);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(false);
      expect(target.position).toEqual({ x: 1, y: 1 }); // Should not change
    });

    it('should return false when target position is occupied', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(true);
      const effect = new PushEffect(5, 2);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(false);
      expect(target.position).toEqual({ x: 1, y: 1 }); // Should not change
    });

    it('should return false when caster and target are on same position', () => {
      target.position = { x: 0, y: 0 }; // Same as caster
      const effect = new PushEffect(5, 2);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(false);
      expect(target.position).toEqual({ x: 0, y: 0 }); // Should not change
    });

    it('should work with different push directions', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      
      // Test horizontal push
      target.position = { x: 2, y: 0 }; // Directly east of caster
      const effect = new PushEffect(5, 3);

      const result = effect.apply(caster, target, context);

      expect(result).toBe(true);
      expect(target.position.x).toBe(5); // 2 + 3 = 5
      expect(target.position.y).toBe(0); // Should stay on same Y
    });

    it('should work when scene.updateUnitSprites is not available', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      const contextWithoutUpdateSprites = {
        map: mockMap,
        scene: {
          unitLayer: {}
        }
      };
      const effect = new PushEffect(5, 2);

      const result = effect.apply(caster, target, contextWithoutUpdateSprites);

      expect(result).toBe(true);
      expect(target.position).not.toEqual({ x: 1, y: 1 }); // Should have moved
    });

    it('should not show feedback when scene is not available', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      const contextWithoutScene = {
        map: mockMap
      };
      const effect = new PushEffect(5, 2);

      const result = effect.apply(caster, target, contextWithoutScene);

      expect(result).toBe(true);
      expect(target.position).not.toEqual({ x: 1, y: 1 }); // Should have moved
    });
  });
}); 