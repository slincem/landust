import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeleportEffect } from '../../../src/core/effects/TeleportEffect';
import { Unit } from '../../../src/core/Unit';
import type { EffectContext } from '../../../src/core/effects/Effect';

describe('TeleportEffect', () => {
  let caster: Unit;
  let context: EffectContext;
  let mockMap: any;

  beforeEach(() => {
    // Create test unit
    caster = new Unit('caster1', 'Caster', 'player', { x: 0, y: 0 }, 1, {
      name: 'TestClass',
      maxHP: 100,
      maxAP: 6,
      maxMP: 4,
      spells: [],
      color: 0xff0000
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
      },
      cellPosition: { x: 3, y: 3 }
    };
  });

  describe('constructor', () => {
    it('should create effect with correct value', () => {
      const effect = new TeleportEffect(0);
      expect(effect).toBeInstanceOf(TeleportEffect);
    });
  });

  describe('apply', () => {
    it('should teleport caster to valid position', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      
      const initialPosition = { ...caster.position };
      const targetPosition = { x: 3, y: 3 };
      const effect = new TeleportEffect(0);

      const result = effect.apply(caster, null, context);

      expect(result).toBe(true);
      expect(caster.position).toEqual(targetPosition);
      expect(mockMap.setOccupied).toHaveBeenCalledWith(initialPosition, null);
      expect(mockMap.setOccupied).toHaveBeenCalledWith(targetPosition, caster);
      expect(context.scene.updateUnitSprites).toHaveBeenCalled();
    });

    it('should return false when map is not available', () => {
      const contextWithoutMap = {
        scene: context.scene,
        cellPosition: context.cellPosition
      };
      const effect = new TeleportEffect(0);

      const result = effect.apply(caster, null, contextWithoutMap);

      expect(result).toBe(false);
      expect(caster.position).toEqual({ x: 0, y: 0 }); // Should not change
    });

    it('should return false when cellPosition is not available', () => {
      const contextWithoutPosition = {
        map: mockMap,
        scene: context.scene
      };
      const effect = new TeleportEffect(0);

      const result = effect.apply(caster, null, contextWithoutPosition);

      expect(result).toBe(false);
      expect(caster.position).toEqual({ x: 0, y: 0 }); // Should not change
    });

    it('should return false when target position is not walkable', () => {
      mockMap.isWalkable.mockReturnValue(false);
      const effect = new TeleportEffect(0);

      const result = effect.apply(caster, null, context);

      expect(result).toBe(false);
      expect(caster.position).toEqual({ x: 0, y: 0 }); // Should not change
    });

    it('should return false when target position is occupied', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(true);
      const effect = new TeleportEffect(0);

      const result = effect.apply(caster, null, context);

      expect(result).toBe(false);
      expect(caster.position).toEqual({ x: 0, y: 0 }); // Should not change
    });

    it('should work when scene.updateUnitSprites is not available', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      const contextWithoutUpdateSprites = {
        map: mockMap,
        scene: {
          unitLayer: {}
        },
        cellPosition: { x: 3, y: 3 }
      };
      const effect = new TeleportEffect(0);

      const result = effect.apply(caster, null, contextWithoutUpdateSprites);

      expect(result).toBe(true);
      expect(caster.position).toEqual({ x: 3, y: 3 });
    });

    it('should not show feedback when scene is not available', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      const contextWithoutScene = {
        map: mockMap,
        cellPosition: { x: 3, y: 3 }
      };
      const effect = new TeleportEffect(0);

      const result = effect.apply(caster, null, contextWithoutScene);

      expect(result).toBe(true);
      expect(caster.position).toEqual({ x: 3, y: 3 });
    });

    it('should create a copy of the position object', () => {
      mockMap.isWalkable.mockReturnValue(true);
      mockMap.isOccupied.mockReturnValue(false);
      const effect = new TeleportEffect(0);

      effect.apply(caster, null, context);

      // Verify that the position is a copy, not a reference
      expect(caster.position).not.toBe(context.cellPosition);
      expect(caster.position).toEqual(context.cellPosition);
    });
  });
}); 