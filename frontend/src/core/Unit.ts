// Unit.ts
// Represents a unit (player or enemy) on the board

import { Spell } from './Spell';
import type { UnitClass } from './unitClasses';

export type UnitType = 'player' | 'enemy';

export interface Position {
  x: number;
  y: number;
}

export class Unit {
  id: string;
  name: string;
  type: UnitType;
  position: Position;
  mp: number;
  maxMP: number;
  ap: number;
  maxAP: number;
  hp: number;
  maxHP: number;
  spells: Spell[];
  selectedSpellIdx: number;
  castsThisTurn: Record<string, number> = {};

  constructor(id: string, name: string, type: UnitType, position: Position, maxMP: number = 4, unitClass?: UnitClass) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.position = position;
    if (unitClass) {
      this.maxHP = unitClass.maxHP;
      this.hp = unitClass.maxHP;
      this.maxAP = unitClass.maxAP;
      this.ap = unitClass.maxAP;
      this.maxMP = unitClass.maxMP;
      this.mp = unitClass.maxMP;
      this.spells = unitClass.spells.map(s => Object.assign(Object.create(Object.getPrototypeOf(s)), s));
    } else {
      this.maxMP = maxMP;
      this.mp = maxMP;
      this.maxAP = 6;
      this.ap = 6;
      this.maxHP = 10;
      this.hp = 10;
      this.spells = [
        new Spell('Spell 1', 4, 3, 3, 1),
        new Spell('Spell 2', 6, 5, 5, 1),
      ];
    }
    this.resetSpellUsage();
    this.selectedSpellIdx = -1; // No spell selected by default
  }

  resetSpellUsage() {
    this.castsThisTurn = {};
    for (const spell of this.spells) {
      this.castsThisTurn[spell.name] = 0;
    }
  }

  get selectedSpell(): Spell | undefined {
    return this.selectedSpellIdx >= 0 ? this.spells[this.selectedSpellIdx] : undefined;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
  }

  canCastSpell(target: Unit): boolean {
    const spell = this.selectedSpell;
    if (!spell) return false;
    // Lógica de límite de lanzamientos
    const casts = this.castsThisTurn[spell.name] ?? 0;
    if (spell.maxCastsPerTurn !== -1 && casts >= spell.maxCastsPerTurn) return false;
    return spell.canCast(this, target);
  }

  castSpell(target: Unit): boolean {
    const spell = this.selectedSpell;
    if (!spell) return false;
    const casts = this.castsThisTurn[spell.name] ?? 0;
    if (spell.maxCastsPerTurn !== -1 && casts >= spell.maxCastsPerTurn) return false;
    const result = spell.cast(this, target);
    if (result) {
      this.castsThisTurn[spell.name] = casts + 1;
    }
    return result;
  }

  startTurn(baseMP: number = 4) {
    this.mp = baseMP;
    this.ap = this.maxAP;
    this.resetSpellUsage();
    this.selectedSpellIdx = -1; // Require manual selection each turn
  }

  restoreResources() {
    this.ap = this.maxAP;
    this.mp = this.maxMP;
  }

  /** Verifies if the unit can move to the destination cell (Manhattan distance) */
  canMoveTo(to: Position): boolean {
    const dist = Math.abs(this.position.x - to.x) + Math.abs(this.position.y - to.y);
    return dist <= this.mp;
  }

  /** Moves the unit along a path, consuming MP */
  async moveTo(path: Position[], onStep?: (pos: Position) => Promise<void>) {
    if (!path || path.length === 0) return;
    let steps = Math.min(path.length, this.mp);
    for (let i = 0; i < steps; i++) {
      this.position = path[i];
      this.mp--;
      if (onStep) {
        await onStep(this.position);
      }
    }
  }
} 