// UIManager.ts
// Manages HTML UI outside the main canvas (turn text and button)

export class UIManager {
  private turnLabel: HTMLDivElement;
  private endTurnButton: HTMLButtonElement;
  private onEndTurn: (() => void) | null = null;

  constructor() {
    // Contenedor principal de la UI
    let uiRoot = document.getElementById('ui-root');
    if (!uiRoot) {
      uiRoot = document.createElement('div');
      uiRoot.id = 'ui-root';
      uiRoot.style.position = 'fixed';
      uiRoot.style.top = '0';
      uiRoot.style.left = '0';
      uiRoot.style.width = '100vw';
      uiRoot.style.height = '100vh';
      uiRoot.style.pointerEvents = 'none';
      document.body.appendChild(uiRoot);
    }

    // Texto de turno
    this.turnLabel = document.createElement('div');
    this.turnLabel.style.position = 'absolute';
    this.turnLabel.style.top = '8px'; // Higher up, outside the game area
    this.turnLabel.style.left = '50%';
    this.turnLabel.style.transform = 'translateX(-50%)';
    this.turnLabel.style.fontFamily = 'sans-serif';
    this.turnLabel.style.fontSize = '2rem';
    this.turnLabel.style.color = 'white';
    this.turnLabel.style.textShadow = '0 2px 8px #222, 0 0 2px #1976d2';
    this.turnLabel.style.fontWeight = 'bold';
    this.turnLabel.style.background = 'rgba(0,0,0,0.25)';
    this.turnLabel.style.padding = '8px 32px';
    this.turnLabel.style.borderRadius = '12px';
    this.turnLabel.style.pointerEvents = 'none';
    uiRoot.appendChild(this.turnLabel);

    // End turn button
    this.endTurnButton = document.createElement('button');
    this.endTurnButton.textContent = 'Terminar turno';
    this.endTurnButton.style.position = 'absolute';
    this.endTurnButton.style.bottom = '40px';
    this.endTurnButton.style.right = '40px';
    this.endTurnButton.style.zIndex = '1000';
    this.endTurnButton.style.padding = '14px 32px';
    this.endTurnButton.style.fontSize = '1.2rem';
    this.endTurnButton.style.background = '#1976d2';
    this.endTurnButton.style.color = 'white';
    this.endTurnButton.style.border = 'none';
    this.endTurnButton.style.borderRadius = '10px';
    this.endTurnButton.style.cursor = 'pointer';
    this.endTurnButton.style.boxShadow = '0 2px 12px #0006';
    this.endTurnButton.style.display = 'none';
    this.endTurnButton.style.pointerEvents = 'auto'; // Permite clics
    this.endTurnButton.onclick = () => {
      if (this.onEndTurn) this.onEndTurn();
    };
    uiRoot.appendChild(this.endTurnButton);
  }

  /** Actualiza el texto del turno */
  setTurnText(text: string) {
    this.turnLabel.textContent = text;
  }

  /** Muestra u oculta el botón de terminar turno */
  setEndTurnButtonVisible(visible: boolean) {
    this.endTurnButton.style.display = visible ? 'block' : 'none';
  }

  /** Asigna el callback para el botón */
  onEndTurnClick(cb: () => void) {
    this.onEndTurn = cb;
  }
} 