import { Application, Sprite } from 'pixi.js';
import { loadInitialAssets } from './loader';

/**
 * Clase principal que orquesta el ciclo de vida del juego.
 * Se encarga de inicializar PixiJS, cargar recursos y gestionar escenas.
 */
export class Game {
  private app: Application;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.app = new Application();
  }

  async start() {
    // Inicializa PixiJS con tamaño mínimo 880x720 (grid 640x640 + espacio para barra de hechizos)
    await this.app.init({
      width: 720,
      height: 880,
      backgroundColor: 0x222244,
      //resizeTo: this.container, // Desactivado para evitar recortes
    });
    this.container.appendChild(this.app.canvas);
    // Centra el canvas con CSS
    this.app.canvas.style.display = 'block';
    this.app.canvas.style.margin = '32px auto';
    this.app.canvas.style.background = '#222244';
    this.app.canvas.style.boxShadow = '0 0 32px #000a';
    // Carga los recursos iniciales
    await loadInitialAssets();
    // Aquí podrías cambiar a la escena inicial (menú, combate, etc.)
    this.showInitialScene();
  }

  private showInitialScene() {
    // Por ahora, solo muestra un fondo cargado
    const bg = Sprite.from('background');
    bg.width = this.app.screen.width;
    bg.height = this.app.screen.height;
    this.app.stage.addChild(bg);
  }
} 