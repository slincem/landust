// Spell.ts
import type { Unit } from './Unit';
import type { Position } from './MapGrid';

export class Spell {
  name: string;
  cost: number; // AP cost
  range: number; // max range (chebyshev)
  damage: number;
  maxCastsPerTurn: number;

  constructor(name: string, cost: number, range: number, damage: number, maxCastsPerTurn: number = 1) {
    this.name = name;
    this.cost = cost;
    this.range = range;
    this.damage = damage;
    this.maxCastsPerTurn = maxCastsPerTurn;
  }

  canCast(caster: Unit, target: Unit): boolean {
    // El control de usos por turno se hace en Unit, aquí solo validamos AP y alcance
    if (caster.ap < this.cost) return false;
    if (!target.isAlive()) return false;
    const dx = Math.abs(caster.position.x - target.position.x);
    const dy = Math.abs(caster.position.y - target.position.y);
    return Math.max(dx, dy) <= this.range && caster !== target;
  }

  cast(caster: Unit, target: Unit): boolean {
    if (!this.canCast(caster, target)) return false;
    caster.ap -= this.cost;
    target.takeDamage(this.damage);
    return true;
  }
} 