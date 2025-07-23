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
      new Spell({
        name: 'IronStrike',
        cost: 2,
        range: 1,
        minRange: 1,
        maxCastsPerTurn: 2,
        targetType: 'enemy',
        effects: [
          { type: 'damage', value: 35 }
        ]
      }),
      new Spell({
        name: 'Charge',
        cost: 3,
        range: 4,
        minRange: 1,
        maxCastsPerTurn: 1,
        targetType: 'enemy',
        effects: [
          { type: 'damage', value: 20 }
        ]
      }),
    ],
    color: 0xc0392b,
  },
  Golarc: {
    name: 'Golarc',
    maxHP: 100,
    maxAP: 7,
    maxMP: 4,
    spells: [
      new Spell({
        name: 'PiercingArrow',
        cost: 3,
        range: 4,
        minRange: 1,
        maxCastsPerTurn: 2,
        targetType: 'enemy',
        effects: [
          { type: 'damage', value: 28 }
        ]
      }),
      new Spell({
        name: 'SlowArrow',
        cost: 4,
        range: 3,
        minRange: 1,
        maxCastsPerTurn: 1,
        targetType: 'enemy',
        effects: [
          { type: 'damage', value: 15 }
        ]
      }),
    ],
    color: 0x2980b9,
  },
  Healium: {
    name: 'Healium',
    maxHP: 100,
    maxAP: 8,
    maxMP: 3,
    spells: [
      new Spell({
        name: 'Restore',
        cost: 5,
        range: 3,
        minRange: 0,
        maxCastsPerTurn: 2,
        targetType: 'selfOnly',
        effects: [
          { type: 'heal', value: 40 }
        ]
      }),
      new Spell({
        name: 'SpiritWave',
        cost: 4,
        range: 2,
        minRange: 1,
        maxCastsPerTurn: 1,
        targetType: 'enemy',
        effects: [
          { type: 'damage', value: 20 }
        ]
      }),
    ],
    color: 0x27ae60,
  },
  Timetac: {
    name: 'Timetac',
    maxHP: 110,
    maxAP: 7,
    maxMP: 4,
    spells: [
      new Spell({
        name: 'DrainTime',
        cost: 4,
        range: 3,
        minRange: 1,
        maxCastsPerTurn: -1,
        targetType: 'enemy',
        effects: [
          { type: 'drain_ap', value: 2, duration: 1 }
        ]
      }),
      new Spell({
        name: 'TimeJump',
        cost: 3,
        range: 3,
        minRange: 1,
        maxCastsPerTurn: 1,
        targetType: 'empty',
        effects: [
          { type: 'teleport', value: 0 }
        ]
      }),
      new Spell({
        name: 'Acceleration',
        cost: 2,
        range: 3,
        minRange: 0,
        maxCastsPerTurn: 1,
        targetType: 'ally',
        effects: [
          { type: 'buff_ap', value: 2, duration: 3 }
        ],
        cooldown: 4
      })
    ],
    color: 0xf1c40f,
  },
}; 