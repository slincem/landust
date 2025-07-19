// Punto de entrada principal
// Initialize PixiJS, load minimal assets and invoke the initial scene
import { Game } from './game';
import { BattleScene } from '@scenes/BattleScene';

// Wait for DOM to be ready
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
    // Background is assumed to be already loaded by Game
    game['app'].stage.addChild(battleScene);
  });
}); 