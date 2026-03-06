import Phaser from 'phaser';

// Define the context for our game FSM
export interface GameContext {
  scene: Phaser.Scene;
  player?: Phaser.Physics.Arcade.Sprite;
  score: number;
}

export class GameEngine {
  private game: Phaser.Game | null = null;
  private containerId: string;

  constructor(containerId: string) {
    this.containerId = containerId;
  }

  public init(configOverrides?: Partial<Phaser.Types.Core.GameConfig>) {
    // Default config for a 2D pixel-art style game
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: this.containerId,
      width: 800,
      height: 600,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 300 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      ...configOverrides
    };

    this.game = new Phaser.Game(config);
    return this.game;
  }

  public destroy() {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  public getGame() {
    return this.game;
  }
}
