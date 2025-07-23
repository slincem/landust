// TurnManager.ts
// Controla el flujo de turnos entre varias unidades
import type { Unit } from './Unit';

export type TurnPhase = 'start' | 'main' | 'end';

type TurnManagerEvent = 'onTurnStart' | 'onTurnEnd' | 'onPhaseChange' | 'onTimerStart';
type TurnManagerListener = (unit: Unit, phase?: TurnPhase) => void;

export class TurnManager {
  private units: Unit[];
  private currentIndex: number = 0;
  private phase: TurnPhase = 'start';
  private listeners: Partial<Record<TurnManagerEvent, TurnManagerListener[]>> = {};
  private turnTimer: number | null = null;
  private turnTimeLimit: number = 0; // seconds, 0 = no limit

  constructor(units: Unit[]) {
    this.units = units;
    this.currentIndex = 0;
    if (this.units.length > 0) {
      this.startTurn();
    }
  }

  /** Returns the unit whose turn is active, skipping dead units. */
  getCurrentUnit(): Unit | null {
    // Loop to find the next alive unit
    let checked = 0;
    while (checked < this.units.length) {
      const unit = this.units[this.currentIndex];
      if (unit.isAlive && typeof unit.isAlive === 'function' ? unit.isAlive() : unit.hp > 0) {
        return unit;
      }
      this.currentIndex = (this.currentIndex + 1) % this.units.length;
      checked++;
    }
    // No alive units found
    return null;
  }

  /** Returns the current phase of the turn */
  getPhase(): TurnPhase {
    return this.phase;
  }

  /** Register an event listener (onTurnStart, onTurnEnd, etc) */
  on(event: TurnManagerEvent, listener: TurnManagerListener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(listener);
  }

  /** Internal: trigger an event */
  private trigger(event: TurnManagerEvent, unit: Unit, phase?: TurnPhase) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]!) {
        cb(unit, phase);
      }
    }
  }

  /** Starts the turn for the current unit */
  startTurn() {
    this.phase = 'start';
    const unit = this.getCurrentUnit();
    if (unit) {
      // Restore AP/MP only if allowed by states
      unit.startTurn();
      // Trigger start-of-turn effects (states, passives, etc)
      if (typeof unit.triggerStartOfTurnEffects === 'function') {
        unit.triggerStartOfTurnEffects();
      }
      this.trigger('onTurnStart', unit, 'start');
      // (Optional) Start timer for turn (not implemented, just hook)
      if (this.turnTimeLimit > 0) {
        this.trigger('onTimerStart', unit, 'start');
      }
      // Move to main phase
      this.mainPhase();
    } else {
      // No alive units, end game or handle appropriately
      console.log('No alive units to start turn.');
      this.phase = 'end'; // Force end phase if no units
      // Do not trigger onTurnEnd with null
    }
  }

  /** Main phase: player can act (move, cast spells, etc) */
  mainPhase() {
    this.phase = 'main';
    const unit = this.getCurrentUnit();
    if (unit) {
      this.trigger('onPhaseChange', unit, 'main');
      // No logic here: BattleScene handles player actions
    } else {
      // No alive units, end game or handle appropriately
      console.log('No alive units to start main phase.');
      this.phase = 'end'; // Force end phase if no units
      // Do not trigger onTurnEnd with null
    }
  }

  /** Ends the turn for the current unit and advances to the next, skipping dead units. */
  endTurn() {
    this.phase = 'end';
    const unit = this.getCurrentUnit();
    if (unit) {
      // Trigger end-of-turn effects (states, passives, etc)
      if (typeof unit.triggerEndOfTurnEffects === 'function') {
        unit.triggerEndOfTurnEffects();
      }
      this.trigger('onTurnEnd', unit, 'end');
    }
    // Advance to next alive unit
    let checked = 0;
    do {
      this.currentIndex = (this.currentIndex + 1) % this.units.length;
      checked++;
      const nextUnit = this.units[this.currentIndex];
      if (nextUnit.isAlive && typeof nextUnit.isAlive === 'function' ? nextUnit.isAlive() : nextUnit.hp > 0) {
        break;
      }
    } while (checked < this.units.length);
    // Start turn for the next alive unit
    this.startTurn();
  }

  /** For future: set a time limit per turn (in seconds) */
  setTurnTimeLimit(seconds: number) {
    this.turnTimeLimit = seconds;
  }

  /** For future: support for team turns, simultaneous turns, AI, etc. */
  // ... (add methods as needed)
} 