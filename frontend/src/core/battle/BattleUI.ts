// BattleUI.ts
import type { Unit } from '@core/Unit';
import type { UIManager } from '@ui/UIManager';
import type { BattleScene } from '@scenes/BattleScene';
import { Container, Graphics, Text, Texture, Sprite } from 'pixi.js';

export class BattleUI {
  constructor(
    private scene: BattleScene,
    public ui: UIManager
  ) {}

  public updateUnitSprites() {
    const active = this.scene.turnManager.getCurrentUnit();
    const activeId = active?.id ?? '';

    for (const unit of this.scene.units) {
      if (!unit.isAlive()) continue;
      const sprite = this.scene.unitSprites.get(unit.id);
      if (!sprite) continue;

      sprite.x = unit.position.x * 64 + 32;
      sprite.y = unit.position.y * 64 + 32;
      sprite.alpha = unit.id === activeId ? 1 : 0.7;
      sprite.tint  = unit.id === activeId ? 0xffffff : 0xcccccc;

      const bar = this.scene.unitBars.get(unit.id);
      if (!bar || !(bar instanceof Container)) continue;
      bar.removeChildren();

      const barWidth  = 44;
      const barHeight = 6;
      const barX      = sprite.x - barWidth / 2;
      let   barY      = sprite.y - 38;

      const drawBar = (ratio: number, color: number) => {
        const bg = new Sprite(Texture.WHITE);
        bg.tint = 0x222222;
        bg.alpha = 1;
        bg.width = barWidth;
        bg.height = barHeight;
        bg.x = barX;
        bg.y = barY;
      
        const fg = new Sprite(Texture.WHITE);
        fg.tint = color;
        fg.alpha = 1;
        fg.width = barWidth * ratio;
        fg.height = barHeight;
        fg.x = barX;
        fg.y = barY;
      
        const group = new Container();
        group.addChild(bg);
        group.addChild(fg);
      
        bar.addChild(group);
      };
      

      drawBar(unit.hp / unit.maxHP, 0x3ecf4a);
      barY -= barHeight + 2;
      drawBar(unit.ap / unit.maxAP, 0x3a8fff);
    }
  }

  public updateTurnLabel(unit?: Unit) {
    const u = unit ?? this.scene.turnManager.getCurrentUnit();
    if (u) {
      this.ui.setTurnText(`Turn of: ${u.name}  |  AP: ${u.ap}`);
    }
  }

  public createSpellBar() {
    const unit = this.scene.turnManager.getCurrentUnit();
    if (!unit) return;

    const spells     = unit.spells;
    const btnW       = 120;
    const btnH       = 40;
    const spacing    = 24;
    const canvasW    = 720;
    const totalWidth = spells.length * btnW + (spells.length - 1) * spacing;

    this.scene.spellBar.removeChildren();
    this.scene.spellButtons = [];

    const bg = new Graphics()
      .fill({ color: 0x23242a, alpha: 0.95 })
      .roundRect((canvasW - totalWidth) / 2 - 24, -8, totalWidth + 48, btnH + 16, 18);
    this.scene.spellBar.addChild(bg);

    for (let i = 0; i < spells.length; i++) {
      const spell        = spells[i];
      const hasAP        = unit.ap >= spell.cost;
      const onCD         = !!(spell.cooldownCounter && spell.cooldownCounter > 0);
      const casts        = unit.castsThisTurn[spell.name] ?? 0;
      const maxReached   = spell.maxCastsPerTurn !== -1 && casts >= spell.maxCastsPerTurn;
      const isEnabled    = hasAP && !onCD && !maxReached;
      const isSelected   = i === unit.selectedSpellIdx;

      const btn = new Container();
      btn.x         = (canvasW - totalWidth) / 2 + i * (btnW + spacing);
      btn.y         = 0;
      btn.eventMode = isEnabled ? 'static' : 'none';
      btn.cursor    = isEnabled ? 'pointer' : 'not-allowed';

      const gfx = new Graphics()
        .fill({ color: isSelected ? 0x1976d2 : isEnabled ? 0x333333 : 0x222222 })
        .roundRect(0, 0, btnW, btnH, 12)
        .setStrokeStyle({ width: 3, color: isSelected ? 0xfff066 : 0x222222 })
        .roundRect(0, 0, btnW, btnH, 12);
      btn.addChild(gfx);

      const label = new Text({
        text: spell.name,
        style: {
          fontSize: 18,
          fill: isSelected ? '#ffffff' : isEnabled ? '#bbbbbb' : '#666666',
          fontWeight: 'bold'
        }
      });
      label.anchor.set(0.5);
      label.x = btnW / 2;
      label.y = btnH / 2;
      btn.addChild(label);

      if (onCD && !isEnabled) {
        const cdText = new Text({
          text: `${spell.cooldownCounter}`,
          style: {
            fontSize: 16,
            fill: '#ffffff',
            fontWeight: 'bold',
            align: 'right'
          }
        });
        cdText.anchor.set(1, 0);
        cdText.x = btnW - 8;
        cdText.y = 4;
        btn.addChild(cdText);
      }

      btn.on('pointerdown', () => {
        if (!isEnabled) return;
        unit.selectedSpellIdx = isSelected ? -1 : i;
        this.createSpellBar();
        this.updateTurnLabel();
        this.scene.movementSystem.updateReachableAndHighlights();
      });

      this.scene.spellBar.addChild(btn);
      this.scene.spellButtons.push(btn);
    }
  }

  public positionSpellBar() {
    let h = 880;
    const renderer = (this.scene.parent as any)?.renderer
                  || (this.scene as any).renderer;
    if (renderer?.screen) h = renderer.screen.height;
    this.scene.spellBarY = h - 48 - 24;
    this.scene.spellBar.y = this.scene.spellBarY;
    this.scene.spellBar.x = 0;
    this.createSpellBar();
  }

  public showDamageText(target: Unit, text: string) {
    const sprite = this.scene.unitSprites.get(target.id);
    if (!sprite) return;

    const dmg = new Text({
      text,
      style: {
        fontSize: 24,
        fill: '#ff4444',
        fontWeight: 'bold'
      }
    });
    dmg.anchor.set(0.5);
    dmg.x = sprite.x;
    dmg.y = sprite.y - 32;
    this.scene.unitLayer.addChild(dmg);

    setTimeout(() => {
      this.scene.unitLayer.removeChild(dmg);
    }, 700);
  }

  public updateEndTurnButton() {
    this.ui.setEndTurnButtonVisible(true);
  }
}
