/**
 * Combat scene with turn-based combat
 */

import Phaser from 'phaser';
import { GameState } from '../GameState';
import { ChatLog } from '../../ui/ChatLog';
import { ChatInput } from '../../ui/ChatInput';
import { AgentDisplay, EnemyDisplay } from '../../ui/GameUI';
import { Enemy, EnemyFactory } from '../../combat/Enemy';
import { GeneratedEvent } from '../../events/EventGenerator';

export class CombatScene extends Phaser.Scene {
  private chatLog!: ChatLog;
  private chatInput!: ChatInput;
  private gameState!: GameState;
  private agentDisplays: AgentDisplay[] = [];
  private enemyDisplays: EnemyDisplay[] = [];
  private currentEvent!: GeneratedEvent;
  private enemies: Enemy[] = [];

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: { event: GeneratedEvent }): void {
    this.currentEvent = data.event;
  }

  async create(): Promise<void> {
    this.gameState = GameState.getInstance();
    this.chatLog = new ChatLog();
    this.chatInput = new ChatInput();

    // Title
    this.add.text(this.cameras.main.centerX, 40, 'COMBAT!', {
      fontSize: '32px',
      color: '#ff0000',
      fontFamily: 'Courier New',
    }).setOrigin(0.5);

    // Display event description
    this.chatLog.addSeparator('COMBAT ENCOUNTER');
    await this.chatLog.streamMessage({ type: "combat", content: this.currentEvent.description });

    // Create enemies
    if (this.currentEvent.enemies) {
      this.enemies = EnemyFactory.createEnemies(this.currentEvent.enemies);
      await this.chatLog.streamMessage({
        type: "system",
        content: `Enemies: ${this.enemies.map(e => e.name).join(', ')}`
      });
    }

    // Display combatants
    this.displayCombatants();

    // Get player doctrine
    await this.chatLog.streamMessage({ type: "system", content: 'Enter your combat doctrine:' });

    this.chatInput.setEnabled(true);
    this.chatInput.focus();

    this.chatInput.onSubmit((doctrine) => {
      this.startCombat(doctrine);
    });
  }

  private displayCombatants(): void {
    // Display agents on the left
    const agentStartX = 150;
    const agentY = 250;

    this.agentDisplays = [];

    this.gameState.agents.forEach((agent, index) => {
      if (agent.isAlive()) {
        const display = new AgentDisplay(
          this,
          agent,
          agentStartX,
          agentY + index * 100
        );
        this.agentDisplays.push(display);
      }
    });

    // Display enemies on the right
    const enemyStartX = this.cameras.main.width - 150;
    const enemyY = 250;

    this.enemyDisplays = [];

    this.enemies.forEach((enemy, index) => {
      const display = new EnemyDisplay(
        this,
        enemy,
        enemyStartX,
        enemyY + index * 100
      );
      this.enemyDisplays.push(display);
    });
  }

  private async startCombat(doctrine: string): Promise<void> {
    this.chatInput.setEnabled(false);
    this.gameState.setDoctrine(doctrine);

    await this.chatLog.streamMessage({ type: "player", speaker: "You", content: `Combat Doctrine: "${doctrine}"` });
    await this.chatLog.streamMessage({ type: "system", content: 'Combat begins!' });

    // Run combat with animations
    await this.runCombatWithAnimations();
  }

  private async runCombatWithAnimations(): Promise<void> {
    this.chatLog.addSeparator('BATTLE LOG');

    let turnCount = 0;

    // Manual turn-by-turn execution
    while (
      this.gameState.agents.some(a => a.isAlive()) &&
      this.enemies.some(e => e.isAlive())
    ) {
      turnCount++;
      await this.chatLog.streamMessage({ type: "system", content: `--- Turn ${turnCount} ---` });

      // Execute one turn
      await this.executeTurnWithAnimation();

      // Update displays
      this.agentDisplays.forEach(display => display.update());
      this.enemyDisplays.forEach(display => display.update());

      // Small delay between turns
      await this.delay(1000);
    }

    // Combat ended
    const victory = this.gameState.agents.some(a => a.isAlive());

    this.chatLog.addSeparator(victory ? 'VICTORY!' : 'DEFEAT!');

    if (victory) {
      this.gameState.clearEvent(true);
      await this.chatLog.streamMessage({ type: "system", content: 'Your party emerged victorious!' });
      await this.chatLog.streamMessage({ type: "system", content: 'Returning to adventure...' });

      await this.delay(3000);
      this.scene.start('GamePlayScene');
    } else {
      await this.chatLog.streamMessage({ type: "system", content: 'Your party has been defeated...' });
      await this.delay(2000);
      this.gameOver();
    }
  }

  private async executeTurnWithAnimation(): Promise<void> {
    // Agents act
    const aliveAgents = this.gameState.agents.filter(a => a.isAlive());

    for (const agent of aliveAgents) {
      await this.chatLog.streamMessage({ type: "system", content: `${agent.name} is thinking...` });

      // Get agent's action (simplified for now)
      const enemyInfo = this.enemies
        .filter(e => e.isAlive())
        .map(e => e.getInfo());

      if (enemyInfo.length === 0) break;

      // Simple action for speed (can be replaced with LLM call)
      // Agents attack the first available enemy

      const targetEnemy = this.enemies.filter(e => e.isAlive())[0];
      if (!targetEnemy) break;

      // Execute attack
      const damage = agent.attack + Math.floor(Math.random() * 5);
      const actualDamage = targetEnemy.takeDamage(damage);

      await this.chatLog.streamMessage({
        type: "combat",
        content: `${agent.name} attacks ${targetEnemy.name} for ${actualDamage} damage!`
      });

      // Animate
      const agentDisplay = this.agentDisplays.find(d => d.getX() > 0); // Find valid display
      const enemyDisplay = this.enemyDisplays.find(d => d.getX() > 0);

      if (agentDisplay && enemyDisplay) {
        await agentDisplay.playAttack(enemyDisplay.getX());
        enemyDisplay.playHit();
      }

      if (!targetEnemy.isAlive()) {
        await this.chatLog.streamMessage({
          type: "combat",
          content: `${targetEnemy.name} has been defeated!`
        });
      }

      this.agentDisplays.forEach(d => d.update());
      this.enemyDisplays.forEach(d => d.update());

      await this.delay(500);

      if (!this.enemies.some(e => e.isAlive())) break;
    }

    // Enemies act
    const aliveEnemies = this.enemies.filter(e => e.isAlive());

    for (const enemy of aliveEnemies) {
      const aliveAgents = this.gameState.agents.filter(a => a.isAlive());
      if (aliveAgents.length === 0) break;

      // Simple AI: attack random agent
      const targetAgent = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];

      const damage = enemy.attack + Math.floor(Math.random() * 5);
      const actualDamage = targetAgent.takeDamage(damage);

      await this.chatLog.streamMessage({
        type: "combat",
        content: `${enemy.name} attacks ${targetAgent.name} for ${actualDamage} damage!`
      });

      // Animate
      const enemyDisplay = this.enemyDisplays.find(d => d.getX() > 0);
      const agentDisplay = this.agentDisplays.find(d => d.getX() > 0);

      if (enemyDisplay && agentDisplay) {
        await enemyDisplay.playAttack(agentDisplay.getX());
        agentDisplay.playHit();
      }

      if (!targetAgent.isAlive()) {
        await this.chatLog.streamMessage({
          type: "combat",
          content: `${targetAgent.name} has fallen!`
        });
      }

      this.agentDisplays.forEach(d => d.update());
      this.enemyDisplays.forEach(d => d.update());

      await this.delay(500);

      if (!this.gameState.agents.some(a => a.isAlive())) break;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  private gameOver(): void {
    const gameOverText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'GAME OVER',
      {
        fontSize: '64px',
        color: '#ff0000',
        fontFamily: 'Courier New',
      }
    );
    gameOverText.setOrigin(0.5);

    const restartButton = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 80,
      '[ RESTART ]',
      {
        fontSize: '24px',
        color: '#00ff00',
        fontFamily: 'Courier New',
      }
    );
    restartButton.setOrigin(0.5);
    restartButton.setInteractive({ useHandCursor: true });

    restartButton.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  update(): void {
    this.agentDisplays.forEach(display => display.update());
    this.enemyDisplays.forEach(display => display.update());
  }
}
