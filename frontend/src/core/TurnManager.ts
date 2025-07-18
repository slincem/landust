// TurnManager.ts
// Controla el flujo de turnos entre varias unidades
import type { Unit } from './Unit';

export class TurnManager {
  units: Unit[];
  private currentIndex: number = 0;

  constructor(units: Unit[]) {
    this.units = units;
    this.currentIndex = 0;
    if (this.units.length > 0) {
      this.units[0].startTurn();
    }
  }

  /** Devuelve la unidad cuyo turno está activo */
  getCurrentUnit(): Unit {
    return this.units[this.currentIndex];
  }

  /** Termina el turno actual y pasa al siguiente */
  endTurn() {
    this.currentIndex = (this.currentIndex + 1) % this.units.length;
    this.getCurrentUnit().startTurn();
  }
} 