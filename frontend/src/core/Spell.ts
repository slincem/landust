// Spell.ts
import type { Unit } from './Unit';
import type { Position } from './MapGrid';

export class Spell {
  name: string;
  cost: number; // AP cost
  range: number; // max range (chebyshev)
  damage: number;
  maxUsesPerTurn: number;
  usesThisTurn: number = 0;

  constructor(name: string, cost: number, range: number, damage: number, maxUsesPerTurn: number = 1) {
    this.name = name;
    this.cost = cost;
    this.range = range;
    this.damage = damage;
    this.maxUsesPerTurn = maxUsesPerTurn;
  }

  resetTurn() {
    this.usesThisTurn = 0;
  }

  canCast(caster: Unit, target: Unit): boolean {
    if (this.usesThisTurn >= this.maxUsesPerTurn) return false;
    if (caster.ap < this.cost) return false;
    if (!target.isAlive()) return false;
    // Chebyshev distance (orthogonal or diagonal)
    const dx = Math.abs(caster.position.x - target.position.x);
    const dy = Math.abs(caster.position.y - target.position.y);
    return Math.max(dx, dy) <= this.range && caster !== target;
  }

  cast(caster: Unit, target: Unit): boolean {
    if (!this.canCast(caster, target)) return false;
    caster.ap -= this.cost;
    this.usesThisTurn++;
    target.takeDamage(this.damage);
    return true;
  }
} 