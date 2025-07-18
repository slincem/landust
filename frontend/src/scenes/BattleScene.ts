// BattleScene.ts
// Orchestrates the battle scene: grid, player, interaction, and rendering
import { Grid, Position } from '@core/Grid';
import { Unit } from '@core/Unit';
import { TurnManager } from '@core/TurnManager';
import { GridView } from '@rendering/GridView';
import { Container, Graphics, Text, TextStyle, Sprite, Texture, SCALE_MODES } from 'pixi.js';
import { UIManager } from '@ui/UIManager';
import { MapGrid } from '@core/MapGrid';

export class BattleScene extends Container {
  private grid: Grid;
  private units: Unit[];
  private unitSprites: Map<string, Container> = new Map();
  private gridView: GridView;
  private turnManager: TurnManager;
  private reachable: Position[] = [];
  private currentPath: Position[] = [];
  private isMoving: boolean = false;
  private basePM: number = 4;
  private gameContainer: Container;
  private backgroundLayer: Container;
  private gridLayer: Container;
  private unitLayer: Container;
  private ui: UIManager;
  private map: MapGrid;
  private damageTexts: Array<{ sprite: Container, timeout: number }> = [];
  private spellRangeLayer: Graphics = new Graphics();
  private unitBars: Map<string, Graphics> = new Map();
  private moveRangeLayer: Graphics = new Graphics();
  private spellBar: Container = new Container();
  private spellButtons: Graphics[] = [];
  private spellBarY: number = 0;

  constructor() {
    super();
    const cellSize = 64;
    const gridSize = cellSize * 10;
    // Fondo sólido (cubre todo el canvas, no solo el grid)
    const bg = new Graphics();
    bg.beginFill(0x2c2f36);
    bg.drawRect(0, 0, 720, 880); // Fondo cubre todo el canvas
    bg.endFill();
    this.addChild(bg); // El fondo es hijo directo de la escena
    // Crea el contenedor principal del juego y capas
    this.gameContainer = new Container();
    this.gridLayer = new Container();
    this.unitLayer = new Container();
    this.gameContainer.addChild(this.gridLayer);
    this.gameContainer.addChild(this.unitLayer);
    this.addChild(this.spellBar);
    window.addEventListener('resize', () => this.positionSpellBar());
    // Capa de grid (solo 640x640)
    this.gridView = new GridView({ cellSize, width: 10, height: 10 });
    this.gridView.x = 0;
    this.gridView.y = 0;
    this.gridLayer.addChild(this.gridView);
    this.gridLayer.addChild(this.spellRangeLayer);
    this.gridLayer.addChild(this.moveRangeLayer);
    // Centra el gameContainer en la parte superior
    this.centerGameContainer();
    this.addChild(this.gameContainer);
    // Lógica de juego
    this.grid = new Grid(10, 10);
    this.map = new MapGrid(10, 10);
    this.units = [
      new Unit('p1', 'Jugador 1', 'player', { x: 0, y: 0 }, this.basePM),
      new Unit('p2', 'Jugador 2', 'player', { x: 9, y: 9 }, this.basePM),
    ];
    // Ocupa las posiciones iniciales
    for (const unit of this.units) {
      this.map.setOccupied(unit.position, unit);
    }
    this.turnManager = new TurnManager(this.units);
    this.gridView = new GridView({ cellSize, width: 10, height: 10 });
    this.gridView.x = 0;
    this.gridView.y = 0;
    this.gridLayer.addChild(this.gridView);
    this.gridLayer.addChild(this.spellRangeLayer);
    this.gridLayer.addChild(this.moveRangeLayer);
    // Renderiza sprites de unidades
    this.createUnitSprites();
    // UI externa
    this.ui = new UIManager();
    this.updateTurnLabel();
    this.updateReachableAndHighlights();
    this.setupInteraction();
    this.ui.onEndTurnClick(() => this.endTurn());
    this.updateEndTurnButton();
    this.createSpellBar();
    this.positionSpellBar(); // <-- Llama aquí, después de turnManager
  }

  // PixiJS llama a este método cuando el contenedor se agrega al stage y el renderer ya existe
  added() {
    this.centerGameContainer();
    // Escucha resize del renderer
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.on('resize', () => this.centerGameContainer());
    }
  }

  /** Busca el renderer de PixiJS subiendo por la jerarquía de padres */
  private getRenderer() {
    let parent = this.parent;
    while (parent && !(parent as any).renderer) {
      parent = (parent as any).parent;
    }
    return parent ? (parent as any).renderer : null;
  }

  /** Centra el gameContainer en la parte superior del canvas, dejando espacio para la barra de hechizos */
  private centerGameContainer() {
    const gridSize = 64 * 10;
    const renderer = this.getRenderer();
    let screenWidth = 720, screenHeight = 880;
    if (renderer && renderer.screen) {
      screenWidth = renderer.screen.width;
      screenHeight = renderer.screen.height;
    }
    this.gameContainer.x = (screenWidth - gridSize) / 2;
    // Grid SIEMPRE en la parte superior, con margen visual
    this.gameContainer.y = 32;
    // Ajusta el tamaño de gridLayer y backgroundLayer para que solo ocupen 640x640
    this.gridLayer.width = gridSize;
    this.gridLayer.height = gridSize;
    // El fondo ya cubre todo el canvas, no es necesario ajustar su tamaño
  }

  /** Crea los sprites de las unidades y los agrega a la capa unitLayer */
  private createUnitSprites() {
    this.unitLayer.removeChildren();
    this.unitSprites.clear();
    this.unitBars.clear();
    for (const unit of this.units) {
      // Usa sprites PNG personalizados para cada jugador
      const spritePath = unit.id === 'p1'
        ? 'player1'
        : 'player2';
      const sprite = new Sprite(Texture.from(spritePath));
      sprite.anchor.set(0.5);
      sprite.width = 48;
      sprite.height = 48;
      // Centra el sprite en la celda
      sprite.x = unit.position.x * 64 + 32;
      sprite.y = unit.position.y * 64 + 32;
      sprite.eventMode = 'none';
      this.unitSprites.set(unit.id, sprite as unknown as Container);
      this.unitLayer.addChild(sprite);
      // Barra de vida y PA
      const bar = new Graphics();
      this.unitBars.set(unit.id, bar);
      this.unitLayer.addChild(bar);
    }
    this.updateUnitSprites();
  }

  /** Actualiza la posición, el contorno y las barras de las unidades */
  private updateUnitSprites() {
    const activeId = this.turnManager.getCurrentUnit().id;
    for (const unit of this.units) {
      const sprite = this.unitSprites.get(unit.id)!;
      sprite.x = unit.position.x * 64 + 32;
      sprite.y = unit.position.y * 64 + 32;
      // Opcional: resalta la unidad activa
      sprite.alpha = unit.id === activeId ? 1 : 0.7;
      sprite.tint = unit.id === activeId ? 0xffffff : 0xcccccc;
      // Barra de vida y PA
      const bar = this.unitBars.get(unit.id);
      if (bar) {
        bar.clear();
        // Fondo gris oscuro
        const barWidth = 44;
        const barHeight = 6;
        const barX = sprite.x - barWidth / 2;
        let barY = sprite.y - 38;
        // Vida (verde)
        bar.beginFill(0x222222);
        bar.drawRect(barX, barY, barWidth, barHeight);
        bar.endFill();
        bar.beginFill(0x3ecf4a);
        bar.drawRect(barX, barY, barWidth * (unit.hp / unit.maxHP), barHeight);
        bar.endFill();
        // PA (azul), justo encima
        barY -= (barHeight + 2);
        bar.beginFill(0x222222);
        bar.drawRect(barX, barY, barWidth, barHeight);
        bar.endFill();
        bar.beginFill(0x3a8fff);
        bar.drawRect(barX, barY, barWidth * (unit.pa / unit.maxPA), barHeight);
        bar.endFill();
      }
    }
  }

  /** Actualiza el label de turno en la UI (incluye PA) */
  private updateTurnLabel() {
    const unit = this.turnManager.getCurrentUnit();
    this.ui.setTurnText(`Turno de: ${unit.name}  |  PA: ${unit.pa}`);
  }

  /** Calcula y muestra las celdas alcanzables y limpia rutas */
  private updateReachableAndHighlights() {
    const unit = this.turnManager.getCurrentUnit();
    this.reachable = this.grid.getReachableCells(unit.position, unit.pm, this.map);
    this.gridView.showReachableCells(this.reachable);
    this.gridView.showPath([]);
  }

  /** Muestra u oculta el botón según el estado de PM de la unidad activa */
  private updateEndTurnButton() {
    // El botón debe estar siempre visible durante el turno
    this.ui.setEndTurnButtonVisible(true);
  }

  /** Posiciona la barra de hechizos dentro del canvas, centrada y con margen inferior */
  private positionSpellBar() {
    // Intenta obtener el tamaño real del renderer/canvas
    let canvasHeight = 880;
    let canvasWidth = 720;
    let renderer = this.getRenderer();
    if (renderer && renderer.screen) {
      canvasHeight = renderer.screen.height;
      canvasWidth = renderer.screen.width;
    }
    const barHeight = 48;
    // Barra de hechizos SIEMPRE en la parte inferior, nunca se superpone al grid
    this.spellBarY = canvasHeight - barHeight - 24;
    this.spellBar.y = this.spellBarY;
    this.spellBar.x = 0;
    this.createSpellBar(canvasWidth, barHeight);
  }

  /** Crea la barra de hechizos en la parte inferior del canvas */
  private createSpellBar(canvasWidth: number = 720, barHeight: number = 48) {
    this.spellBar.removeChildren();
    this.spellButtons = [];
    const unit = this.turnManager.getCurrentUnit();
    const spells = unit.spells;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const spacing = 24;
    const totalWidth = spells.length * buttonWidth + (spells.length - 1) * spacing;
    const y = 0; // Ya está posicionado por this.spellBar.y
    // Fondo de la barra
    const barBg = new Graphics();
    barBg.beginFill(0x23242a, 0.95);
    barBg.drawRoundedRect((canvasWidth - totalWidth) / 2 - 24, y - 8, totalWidth + 48, barHeight + 16, 18);
    barBg.endFill();
    this.spellBar.addChild(barBg);
    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i];
      const btn = new Graphics();
      // Fondo
      btn.beginFill(i === unit.selectedSpellIdx ? 0x1976d2 : 0x333333);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      btn.endFill();
      // Borde
      btn.lineStyle(3, i === unit.selectedSpellIdx ? 0xfff066 : 0x222222);
      btn.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      // Texto
      const label = new Text(spell.name, new TextStyle({ fontSize: 18, fill: i === unit.selectedSpellIdx ? '#fff' : '#bbb', fontWeight: 'bold' }));
      label.anchor.set(0.5);
      label.x = buttonWidth / 2;
      label.y = buttonHeight / 2;
      btn.addChild(label);
      btn.x = (canvasWidth - totalWidth) / 2 + i * (buttonWidth + spacing);
      btn.y = y;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointerdown', () => {
        unit.selectedSpellIdx = i;
        this.createSpellBar(canvasWidth, barHeight);
        this.updateTurnLabel();
        // Forzar recalculo de área de hechizo
        this.gridView.emit('pointermove', { global: { x: 0, y: 0 } });
      });
      this.spellBar.addChild(btn);
      this.spellButtons.push(btn);
    }
  }

  /** Lógica de interacción: solo la unidad activa puede moverse o atacar */
  private setupInteraction() {
    // Movimiento sobre el grid
    this.gridView.on('pointermove', (e: any) => {
      if (this.isMoving) return;
      this.clearEnemyHighlights();
      // Dibuja el área de alcance del hechizo (rojo claro) solo si hay hechizo seleccionado
      this.spellRangeLayer.clear();
      const unit = this.turnManager.getCurrentUnit();
      if (unit.selectedSpell) {
        const range = unit.selectedSpell.range;
        for (let dx = -range; dx <= range; dx++) {
          for (let dy = -range; dy <= range; dy++) {
            const tx = unit.position.x + dx;
            const ty = unit.position.y + dy;
            if (tx === unit.position.x && ty === unit.position.y) continue;
            if (tx < 0 || tx >= 10 || ty < 0 || ty >= 10) continue;
            const cheb = Math.max(Math.abs(dx), Math.abs(dy));
            if (cheb <= range) {
              // No resaltes celdas ocupadas por aliados
              const occupant = this.map.getOccupant({ x: tx, y: ty });
              if (!occupant || occupant.type !== unit.type) {
                this.spellRangeLayer.beginFill(0xff4444, 0.18);
                this.spellRangeLayer.drawRect(tx * 64, ty * 64, 64, 64);
                this.spellRangeLayer.endFill();
              }
            }
          }
        }
      }
      // Dibuja el área de movimiento (PM) en azul
      this.moveRangeLayer.clear();
      if (unit.pm > 0) {
        const moveCells = this.grid.getReachableCells(unit.position, unit.pm, this.map);
        for (const cell of moveCells) {
          this.moveRangeLayer.beginFill(0x3a8fff, 0.18);
          this.moveRangeLayer.drawRect(cell.x * 64, cell.y * 64, 64, 64);
          this.moveRangeLayer.endFill();
        }
      }
      // Path de movimiento y resaltado de enemigos
      this.gridView.showPath([]);
      const localX = e.global.x - this.gameContainer.x;
      const localY = e.global.y - this.gameContainer.y;
      const mouseCell = this.gridView.getCellAtPixel(localX, localY);
      if (mouseCell) {
        for (const other of this.units) {
          if (other !== unit && other.isAlive() && unit.canCastSpell(other)) {
            if (other.position.x === mouseCell.x && other.position.y === mouseCell.y) {
              const sprite = this.unitSprites.get(other.id);
              if (sprite) sprite.tint = 0xff4444;
            }
          }
        }
        // Path y highlights solo si la celda es válida para movimiento
        if (this.isCellReachable(mouseCell, unit)) {
          const path = this.grid.findPath(unit.position, mouseCell, unit.pm, this.map);
          if (path && path.length > 0 && path.length <= unit.pm) {
            this.currentPath = path;
            this.gridView.showPath(path);
          } else {
            this.gridView.showPath([]);
          }
        } else {
          this.gridView.showPath([]);
        }
      } else {
        this.gridView.showPath([]);
      }
    });
    // Limpia el área de alcance y highlights al salir del grid
    this.gridView.on('pointerout', () => {
      this.spellRangeLayer.clear();
      this.moveRangeLayer.clear();
      this.clearEnemyHighlights();
      this.gridView.showPath([]);
    });
    // Clic sobre el grid (movimiento)
    this.gridView.on('pointerdown', async (e: any) => {
      if (this.isMoving) return;
      const unit = this.turnManager.getCurrentUnit();
      const localX = e.global.x - this.gameContainer.x;
      const localY = e.global.y - this.gameContainer.y;
      const pos = this.gridView.getCellAtPixel(localX, localY);
      if (pos && this.isCellReachable(pos, unit)) {
        const path = this.grid.findPath(unit.position, pos, unit.pm, this.map);
        if (path && path.length > 0 && path.length <= unit.pm) {
          this.isMoving = true;
          // Libera la celda actual antes de mover
          this.map.setOccupied(unit.position, null);
          let prevPos = unit.position;
          await unit.moveTo(path, async (stepPos) => {
            // Libera la celda anterior y ocupa la nueva
            this.map.setOccupied(prevPos, null);
            this.map.setOccupied(stepPos, unit);
            prevPos = stepPos;
            this.updateUnitSprites();
            await new Promise(res => setTimeout(res, 200));
          });
          this.updateUnitSprites();
          this.updateReachableAndHighlights();
          this.isMoving = false;
          this.updateEndTurnButton();
        }
      }
    });
    // Clic sobre sprites enemigos (hechizo)
    this.setupSpellListeners();
    this.positionSpellBar();
  }

  /** Verifica si una celda es alcanzable para la unidad activa */
  private isCellReachable(pos: Position, unit: Unit): boolean {
    return this.reachable.some(c => c.x === pos.x && c.y === pos.y);
  }

  /** Limpia el resaltado de enemigos */
  private clearEnemyHighlights() {
    for (const other of this.units) {
      const sprite = this.unitSprites.get(other.id);
      if (sprite) {
        sprite.tint = other.id === this.turnManager.getCurrentUnit().id ? 0xffffff : 0xcccccc;
      }
    }
  }

  /** Muestra un texto flotante de daño sobre el objetivo */
  private showDamageText(target: Unit, text: string) {
    const sprite = this.unitSprites.get(target.id);
    if (!sprite) return;
    const dmgText = new Text(text, { fontSize: 24, fill: '#ff4444', fontWeight: 'bold', stroke: '#fff', strokeThickness: 2 });
    dmgText.anchor.set(0.5);
    dmgText.x = sprite.x;
    dmgText.y = sprite.y - 32;
    this.unitLayer.addChild(dmgText);
    const timeout = window.setTimeout(() => {
      this.unitLayer.removeChild(dmgText);
    }, 700);
    this.damageTexts.push({ sprite: dmgText, timeout });
  }

  /** Termina el turno actual y pasa al siguiente */
  private endTurn() {
    this.turnManager.endTurn();
    this.updateTurnLabel();
    this.updateReachableAndHighlights();
    this.updateUnitSprites();
    this.updateEndTurnButton();
    this.clearEnemyHighlights();
    this.spellRangeLayer.clear();
    this.moveRangeLayer.clear();
    this.setupSpellListeners();
    this.positionSpellBar();
  }

  /** Configura los listeners de hechizo sobre los sprites enemigos (solo para el jugador activo) */
  private setupSpellListeners() {
    // Limpia listeners previos
    for (const other of this.units) {
      const sprite = this.unitSprites.get(other.id);
      const bar = this.unitBars.get(other.id);
      if (sprite) {
        sprite.removeAllListeners && sprite.removeAllListeners('pointerdown');
        sprite.eventMode = 'none';
        sprite.cursor = '';
      }
      if (bar) {
        bar.removeAllListeners && bar.removeAllListeners();
      }
    }
    // Solo el jugador activo puede atacar
    const caster = this.turnManager.getCurrentUnit();
    for (const other of this.units) {
      if (other === caster) continue;
      const sprite = this.unitSprites.get(other.id);
      if (!sprite) continue;
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointerdown', () => {
        // Solo permite atacar si hay hechizo seleccionado
        if (caster.selectedSpellIdx === -1) return;
        // Solo permite atacar si el mouse está sobre la celda lógica del objetivo
        const mouseCell = { x: other.position.x, y: other.position.y };
        if (!caster.canCastSpell(other)) return;
        if (caster.castSpell(other)) {
          this.showDamageText(other, `-${caster.selectedSpell ? caster.selectedSpell.damage : ''}`);
          this.updateTurnLabel();
          this.updateUnitSprites(); // Actualiza barras tras daño
          if (!other.isAlive()) {
            this.unitLayer.removeChild(sprite);
            const bar = this.unitBars.get(other.id);
            if (bar) this.unitLayer.removeChild(bar);
            this.map.setOccupied(other.position, null);
            this.units = this.units.filter(u => u !== other);
            this.setupSpellListeners();
          } else {
            this.setupSpellListeners();
          }
        }
      });
    }
  }
} 