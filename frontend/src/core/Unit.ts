// Unit.ts
// Represents a unit (player or enemy) on the board

import { Spell } from './Spell';

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

  constructor(id: string, name: string, type: UnitType, position: Position, maxMP: number = 4) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.position = position;
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
    this.selectedSpellIdx = -1; // No spell selected by default
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
    if (!this.selectedSpell) return false;
    return this.selectedSpell.canCast(this, target);
  }

  castSpell(target: Unit): boolean {
    if (!this.selectedSpell) return false;
    return this.selectedSpell.cast(this, target);
  }

  startTurn(baseMP: number = 4) {
    this.mp = baseMP;
    this.ap = this.maxAP;
    for (const spell of this.spells) spell.resetTurn();
    this.selectedSpellIdx = -1; // Require manual selection each turn
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