// Unit.ts
// Represents a unit (player or enemy) on the board

import { Spell } from './Spell';
import type { UnitClass } from './unitClasses';

export type UnitType = 'player' | 'enemy';

export interface Position {
  x: number;
  y: number;
}

// State type for extensible effects
export interface State {
  id: string; // Unique identifier
  type: 'ap_loss' | 'mp_loss' | 'poison' | 'buff' | 'debuff' | string;
  duration: number; // Turns remaining
  value?: number;
  source?: string;
  stackable?: boolean;
  expire?: 'start' | 'end'; // When to decrement and remove (default: 'start')
}

/**
 * Represents a unit (player or enemy) on the board.
 * Each unit belongs to a team (faction) for targeting logic.
 */
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
  shouldRestoreAP: boolean = true;
  team: number;

  /** List of active states on this unit */
  public states: State[] = [];

  constructor(id: string, name: string, type: UnitType, position: Position, arg5?: number | UnitClass, arg6?: UnitClass) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.position = position;
    if (typeof arg5 === 'number' && arg6) {
      // (id, name, type, position, team, unitClass)
      this.team = arg5;
      const unitClass = arg6;
      this.maxHP = unitClass.maxHP;
      this.hp = unitClass.maxHP;
      this.maxAP = unitClass.maxAP;
      this.ap = unitClass.maxAP;
      this.maxMP = unitClass.maxMP;
      this.mp = unitClass.maxMP;
      this.spells = unitClass.spells.map(s => Object.assign(Object.create(Object.getPrototypeOf(s)), s));
    } else if (typeof arg5 === 'number') {
      // (id, name, type, position, maxMP)
      this.team = 1;
      this.maxMP = arg5;
      this.mp = arg5;
      this.maxAP = 6;
      this.ap = 6;
      this.maxHP = 10;
      this.hp = 10;
      this.spells = [
        new Spell('Spell 1', 4, 3, 3, 1),
        new Spell('Spell 2', 6, 5, 5, 1),
      ];
    } else {
      // (id, name, type, position)
      this.team = 1;
      this.maxMP = 4;
      this.mp = 4;
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

  /**
   * Called by EffectEngine to apply damage.
   */
  public takeDamage(amount: number) {
    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;
  }

  canCastSpell(target: Unit): boolean {
    const spell = this.selectedSpell;
    if (!spell) return false;
    // Spell usage limit logic
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

  preventAPRestore() {
    this.shouldRestoreAP = false;
  }

  /**
   * Apply a new state to the unit.
   */
  public applyState(state: State) {
    // If not stackable, replace existing state of same type
    if (!state.stackable) {
      this.states = this.states.filter(s => s.type !== state.type);
    }
    this.states.push({ ...state });
  }

  /**
   * Remove a state by id.
   */
  public removeState(id: string) {
    this.states = this.states.filter(s => s.id !== id);
  }

  /**
   * Check if the unit has a state of a given type.
   */
  public hasState(type: string): boolean {
    return this.states.some(s => s.type === type);
  }

  /**
   * Update all states: decrement duration, remove expired.
   * By default, called at the start of the turn.
   * For future extensibility, states can have an 'expire' field ('start' | 'end').
   */
  public updateStates(phase: 'start' | 'end' = 'start') {
    for (let i = this.states.length - 1; i >= 0; i--) {
      const state = this.states[i];
      const expire = state.expire ?? 'start';
      if (expire === phase) {
        state.duration -= 1;
      }
      if (state.duration <= 0) {
        // If expiring an 'ap_loss' state at end of turn, restore AP immediately
        if (state.type === 'ap_loss' && expire === 'end') {
          this.ap = this.maxAP;
        }
        // (Future: handle other resource/blocking states here)
        this.states.splice(i, 1);
      }
    }
  }

  /**
   * Hook: called at the start of the unit's turn (for passives, states, etc).
   * Extend as needed for future effects.
   */
  public triggerStartOfTurnEffects() {
    // Example: apply start-of-turn poison, buffs, etc.
    // (No-op for now)
  }

  /**
   * Hook: called at the end of the unit's turn (for passives, states, etc).
   * Extend as needed for future effects.
   */
  public triggerEndOfTurnEffects() {
    // Example: apply end-of-turn poison, buffs, etc.
    // (No-op for now)
  }

  /**
   * Called at the start of the unit's turn.
   * Restores AP/MP unless prevented by a state.
   */
  startTurn(baseMP: number = 4) {
    // Update states at the start of turn (expire 'start' states)
    this.updateStates('start');
    this.mp = baseMP;
    // Only restore AP if not under 'ap_loss' state
    if (this.shouldRestoreAP && !this.hasState('ap_loss')) {
      this.ap = this.maxAP;
    }
    // Only restore MP if not under 'mp_loss' state (future-proof)
    if (!this.hasState('mp_loss')) {
      this.mp = this.maxMP;
    }
    this.shouldRestoreAP = true;
    this.resetSpellUsage();
    this.selectedSpellIdx = -1; // Require manual selection each turn
  }

  /**
   * Call this at the end of the turn to expire 'end' states (future extensibility).
   */
  public updateEndOfTurnStates() {
    this.updateStates('end');
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

  /**
   * Called by EffectEngine to apply healing.
   */
  public heal(amount: number) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  loseAP(amount: number): number {
    const before = this.ap;
    this.ap = Math.max(0, this.ap - amount);
    return before - this.ap;
  }

  /** Returns true if the other unit is the same as this one (by id). */
  isSelf(other: Unit): boolean {
    return this.id === other.id;
  }
  /** Returns true if the other unit is an ally (same team, not self). */
  isAllyOf(other: Unit): boolean {
    return this.team === other.team && this.id !== other.id;
  }
  /** Returns true if the other unit is an enemy (different team). */
  isEnemyOf(other: Unit): boolean {
    return this.team !== other.team;
  }
} 