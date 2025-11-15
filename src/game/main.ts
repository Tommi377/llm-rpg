/**
 * Main entry point for the Phaser game
 */

import Phaser from 'phaser';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GamePlayScene } from './scenes/GamePlayScene';
import { CombatScene } from './scenes/CombatScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'phaser-game',
  backgroundColor: '#000000',
  scene: [MainMenuScene, GamePlayScene, CombatScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

// Create game instance
const game = new Phaser.Game(config);

// Log initialization
console.log('LLM Squad RPG initialized');
console.log('Make sure Ollama is running with: ollama run llama3');

// Export for debugging
(window as any).game = game;
