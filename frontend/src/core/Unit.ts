// Unit.ts
// Representa una unidad (jugador o enemigo) en el tablero

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
  pm: number;
  maxPM: number;
  pa: number;
  maxPA: number;
  hp: number;
  maxHP: number;
  spells: Spell[];
  selectedSpellIdx: number;

  constructor(id: string, name: string, type: UnitType, position: Position, maxPM: number = 4) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.position = position;
    this.maxPM = maxPM;
    this.pm = maxPM;
    this.maxPA = 6;
    this.pa = 6;
    this.maxHP = 10;
    this.hp = 10;
    this.spells = [
      new Spell('Hechizo 1', 4, 3, 3, 1),
      new Spell('Hechizo 2', 6, 5, 5, 1),
    ];
    this.selectedSpellIdx = -1; // Ningún hechizo seleccionado por defecto
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

  startTurn(basePM: number = 4) {
    this.pm = basePM;
    this.pa = this.maxPA;
    for (const spell of this.spells) spell.resetTurn();
    this.selectedSpellIdx = -1; // Requiere selección manual cada turno
  }

  /** Verifica si la unidad puede moverse a la celda destino (por distancia Manhattan) */
  canMoveTo(to: Position): boolean {
    const dist = Math.abs(this.position.x - to.x) + Math.abs(this.position.y - to.y);
    return dist <= this.pm;
  }

  /** Mueve la unidad a lo largo de un camino, consumiendo PM */
  async moveTo(path: Position[], onStep?: (pos: Position) => Promise<void>) {
    if (!path || path.length === 0) return;
    let steps = Math.min(path.length, this.pm);
    for (let i = 0; i < steps; i++) {
      this.position = path[i];
      this.pm--;
      if (onStep) {
        await onStep(this.position);
      }
    }
  }
} 