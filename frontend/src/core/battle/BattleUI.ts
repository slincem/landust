// BattleUI.ts
// Handles UI rendering and feedback for the tactical RPG battle system.
// This class is responsible for updating the turn label, spell bar, and other UI elements.

import type { Unit } from '@core/Unit';
import type { UIManager } from '@ui/UIManager';
import type { BattleScene } from '@scenes/BattleScene';
import { Graphics, Text, TextStyle } from 'pixi.js';

export class BattleUI {
  constructor(
    private scene: BattleScene,
    public ui: UIManager
  ) {}

  /** Updates the position, outline, and bars of units. Used by BattleScene. */
  public updateUnitSprites() {
    const activeUnit = this.scene.turnManager.getCurrentUnit();
    const activeId = activeUnit ? activeUnit.id : '';
    for (const unit of this.scene.units) {
      if (!unit.isAlive()) continue; // Skip dead units
      const sprite = this.scene.unitSprites.get(unit.id);
      if (!sprite) continue;
      sprite.x = unit.position.x * 64 + 32;
      sprite.y = unit.position.y * 64 + 32;
      // Optional: highlights the active unit
      sprite.alpha = unit.id === activeId ? 1 : 0.7;
      sprite.tint = unit.id === activeId ? 0xffffff : 0xcccccc;
      // HP and AP bars
      const bar = this.scene.unitBars.get(unit.id);
      if (bar) {
        bar.clear();
        // Dark gray background
        const barWidth = 44;
        const barHeight = 6;
        const barX = sprite.x - barWidth / 2;
        let barY = sprite.y - 38;
        // HP (green)
        bar.beginFill(0x222222);
        bar.drawRect(barX, barY, barWidth, barHeight);
        bar.endFill();
        bar.beginFill(0x3ecf4a);
        bar.drawRect(barX, barY, barWidth * (unit.hp / unit.maxHP), barHeight);
        bar.endFill();
        // AP (blue), right above
        barY -= (barHeight + 2);
        bar.beginFill(0x222222);
        bar.drawRect(barX, barY, barWidth, barHeight);
        bar.endFill();
        bar.beginFill(0x3a8fff);
        bar.drawRect(barX, barY, barWidth * (unit.ap / unit.maxAP), barHeight);
        bar.endFill();
      }
    }
  }

  /** Updates the turn label in the UI. Used by BattleScene. */
  public updateTurnLabel(unit?: Unit) {
    if (!unit) unit = this.scene.turnManager.getCurrentUnit();
    if (unit) {
      this.ui.setTurnText(`Turn of: ${unit.name}  |  AP: ${unit.ap}`);
    }
  }

  /** Creates the spell bar at the bottom of the canvas. Used by BattleScene. */
  public createSpellBar() {
    const unit = this.scene.turnManager.getCurrentUnit();
    if (!unit) return;
    const spells = unit.spells;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const spacing = 24;
    const barHeight = 48;
    const canvasWidth = 720;
    const totalWidth = spells.length * buttonWidth + (spells.length - 1) * spacing;
    const y = 0;
    this.scene.spellBar.removeChildren();
    this.scene.spellButtons = [];
    // Spell bar background
    const barBg = new Graphics();
    barBg.beginFill(0x23242a, 0.95);
    barBg.drawRoundedRect((canvasWidth - totalWidth) / 2 - 24, y - 8, totalWidth + 48, barHeight + 16, 18);
    barBg.endFill();
    this.scene.spellBar.addChild(barBg);
    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i];
      const hasAP = unit.ap >= spell.cost;
      const casts = unit.castsThisTurn[spell.name] ?? 0;
      const isOnCooldown = spell.cooldownCounter && spell.cooldownCounter > 0;
      const maxCastsReached = spell.maxCastsPerTurn !== -1 && casts >= spell.maxCastsPerTurn;
      const isEnabled = hasAP && !isOnCooldown && !maxCastsReached;
      const isSelected = i === unit.selectedSpellIdx;
      const btn = new Graphics();
      btn.beginFill(isSelected ? 0x1976d2 : isEnabled ? 0x333333 : 0x222222);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      btn.endFill();
      btn.lineStyle(3, isSelected ? 0xfff066 : 0x222222);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      const label = new Text(spell.name, new TextStyle({ fontSize: 18, fill: isSelected ? '#fff' : isEnabled ? '#bbb' : '#666', fontWeight: 'bold' }));
      label.anchor.set(0.5);
      label.x = buttonWidth / 2;
      label.y = buttonHeight / 2;
      btn.addChild(label);
      if (isOnCooldown && !isEnabled) {
        this.renderCooldownIndicator(btn, spell.cooldownCounter, buttonWidth);
      }
      btn.x = (canvasWidth - totalWidth) / 2 + i * (buttonWidth + spacing);
      btn.y = y;
      btn.eventMode = isEnabled ? 'static' : 'none';
      btn.cursor = isEnabled ? 'pointer' : 'not-allowed';
      btn.on('pointerdown', () => {
        if (!isEnabled) return;
        if (unit.selectedSpellIdx === i) {
          unit.selectedSpellIdx = -1;
        } else {
          unit.selectedSpellIdx = i;
        }
        this.createSpellBar();
        this.updateTurnLabel();
        this.scene.movementSystem.updateReachableAndHighlights();
      });
      this.scene.spellBar.addChild(btn);
      this.scene.spellButtons.push(btn);
    }
  }

  /** Renders a small cooldown number in the top-right corner of a spell button if the spell is on cooldown. */
  public renderCooldownIndicator(btn: Graphics, cooldown: number, buttonWidth: number) {
    if (!cooldown || cooldown <= 0) return;
    const cdText = new Text(`${cooldown}`, new TextStyle({
      fontSize: 16,
      fill: '#fff',
      fontWeight: 'bold',
      stroke: '#222',
      strokeThickness: 3,
      align: 'right',
    }));
    cdText.anchor.set(1, 0);
    cdText.x = buttonWidth - 8;
    cdText.y = 4;
    btn.addChild(cdText);
  }

  /** Positions the spell bar within the canvas. Used by BattleScene. */
  public positionSpellBar() {
    let canvasHeight = 880;
    let canvasWidth = 720;
    let renderer = (this.scene.parent as any)?.renderer || (this.scene as any).renderer;
    if (renderer && renderer.screen) {
      canvasHeight = renderer.screen.height;
      canvasWidth = renderer.screen.width;
    }
    const barHeight = 48;
    this.scene.spellBarY = canvasHeight - barHeight - 24;
    this.scene.spellBar.y = this.scene.spellBarY;
    this.scene.spellBar.x = 0;
    this.createSpellBar();
  }

  /** Shows a floating damage text over the target. Used by BattleScene. */
  public showDamageText(target: Unit, text: string) {
    const sprite = this.scene.unitSprites.get(target.id);
    if (!sprite) return;
    const dmgText = new Text(text, { fontSize: 24, fill: '#ff4444', fontWeight: 'bold', stroke: '#fff' });
    dmgText.anchor.set(0.5);
    dmgText.x = sprite.x;
    dmgText.y = sprite.y - 32;
    this.scene.unitLayer.addChild(dmgText);
    const timeout = window.setTimeout(() => {
      this.scene.unitLayer.removeChild(dmgText);
    }, 700);
    // Optionally, store for cleanup if needed
  }

  /** Shows or hides the button based on the active unit's PM state. */
  public updateEndTurnButton() {
    this.ui.setEndTurnButtonVisible(true);
  }
} 