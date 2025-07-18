import { Assets } from 'pixi.js';

/**
 * Carga los recursos iniciales del juego (por ejemplo, el fondo).
 * Puedes agregar más assets en el futuro.
 */
export async function loadInitialAssets() {
  await Assets.load([
    {
      alias: 'background',
      src: '/assets/background.png',
    },
    {
      alias: 'player1',
      src: '/assets/sprites/player1.png',
    },
    {
      alias: 'player2',
      src: '/assets/sprites/player2.png',
    },
  ]);
} 