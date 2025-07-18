// Unit classes for the tactical RPG
import { Spell } from './Spell';

export interface UnitClass {
  name: string;
  maxHP: number;
  maxAP: number;
  maxMP: number;
  spells: Spell[];
  passive?: string;
  color?: number;
}

export const UnitClasses: Record<string, UnitClass> = {
  Warrem: {
    name: 'Warrem',
    maxHP: 140,
    maxAP: 6,
    maxMP: 4,
    spells: [
      new Spell('IronStrike', 2, 1, 35, 2), // Melee, high damage, range 1, 2 casts/turn
      new Spell('Charge', 3, 4, 20, 1),     // Dash, 1 cast/turn
    ],
    color: 0xc0392b,
  },
  Golarc: {
    name: 'Golarc',
    maxHP: 100,
    maxAP: 7,
    maxMP: 4,
    spells: [
      new Spell('PiercingArrow', 3, 4, 28, 2), // Range 4, 2 casts/turn
      new Spell('SlowArrow', 4, 3, 15, 1),     // Reduces MP, 1 cast/turn
    ],
    color: 0x2980b9,
  },
  Healium: {
    name: 'Healium',
    maxHP: 100,
    maxAP: 8,
    maxMP: 3,
    spells: [
      new Spell('Restore', 5, 3, -40, 2),      // Heals 40 HP, 2 casts/turn
      new Spell('SpiritWave', 4, 2, 20, 1),    // Push + damage, 1 cast/turn
    ],
    color: 0x27ae60,
  },
  Timetac: {
    name: 'Timetac',
    maxHP: 110,
    maxAP: 7,
    maxMP: 4,
    spells: [
      new Spell('DrainTime', 4, 3, 0, -1),     // Steals AP, unlimited casts/turn
      new Spell('TimeJump', 3, 3, 0, 1),       // Teleport, 1 cast/turn
    ],
    color: 0xf1c40f,
  },
}; 