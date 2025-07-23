// BattleLogic.ts
// Handles turn flow, unit death, and unit interaction for the tactical RPG battle system.
// This class is responsible for managing the current unit, skipping dead units, and handling unit death events.

import type { Unit } from '@core/Unit';
import type { TurnManager } from '@core/TurnManager';
import type { MapGrid } from '@core/MapGrid';
import type { BattleScene } from '@scenes/BattleScene';

export class BattleLogic {
  constructor(
    private scene: BattleScene,
    private turnManager: TurnManager,
    private map: MapGrid
  ) {}

  handleUnitDeath(unit: Unit) {
    this.scene.removeUnitVisuals(unit);
    this.map.setOccupied(unit.position, null);
    // Future: trigger death animation, effects, etc.
  }

  skipDeadUnits() {
    // Ensures the current unit is alive, otherwise skips turn
    let unit = this.turnManager.getCurrentUnit();
    while (unit && !unit.isAlive()) {
      this.turnManager.endTurn();
      unit = this.turnManager.getCurrentUnit();
    }
  }

  /**
   * Orchestrates the start of the turn: skips dead units, calls unit.startTurn(), and updates UI/visuals.
   * This method should be called at the beginning of each turn.
   */
  public startTurn() {
    this.skipDeadUnits();
    const unit = this.turnManager.getCurrentUnit();
    if (unit && unit.isAlive()) {
      unit.startTurn();
    }
    // Ensure UI reflects AP/HP changes immediately after logic update
    this.scene.battleUI.updateUnitSprites();
    this.scene.updateTurnLabel();
    this.scene.createSpellBar();
    this.scene.updateReachableAndHighlights();
    this.scene.ui.setEndTurnButtonVisible(true);
  }

  /**
   * Ends the turn for the current unit and advances to the next, skipping dead units.
   * Calls startTurn() for the next unit.
   * Decrements state durations only at the end of the turn.
   */
  public endTurn() {
    const unit = this.turnManager.getCurrentUnit();
    if (unit && unit.isAlive()) {
      unit.updateEndOfTurnStates();
    }
    this.turnManager.endTurn();
    this.startTurn();
  }
} 