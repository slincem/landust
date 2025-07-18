// Punto de entrada principal
// Inicializa PixiJS, carga assets mínimos e invoca la escena inicial
import { Game } from './game';
import { BattleScene } from '@scenes/BattleScene';

// Espera a que el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('No se encontró el contenedor del juego');
  }
  // Instancia y lanza el juego
  const game = new Game(container);
  game.start().then(() => {
    // Instancia la escena de batalla y la agrega al stage
    const battleScene = new BattleScene();
    // Se asume que el fondo ya está cargado por Game
    game['app'].stage.addChild(battleScene);
  });
}); 