/**
 * In-game UI components for Phaser
 * HP bars, status displays, etc.
 */

import Phaser from 'phaser';
import { Agent } from '../agents/Agent';
import { Enemy } from '../combat/Enemy';

export class HPBar {
  private width: number;
  private background: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 100,
    height: number = 12
  ) {
    this.width = width;

    // Create background
    this.background = scene.add.rectangle(0, 0, width, height, 0x333333);
    this.background.setOrigin(0, 0.5);
    this.background.setStrokeStyle(1, 0xffffff);

    // Create HP bar
    this.bar = scene.add.rectangle(0, 0, width, height, 0x00ff00);
    this.bar.setOrigin(0, 0.5);

    // Create text
    this.text = scene.add.text(width / 2, 0, '', {
      fontSize: '10px',
      color: '#ffffff',
    });
    this.text.setOrigin(0.5, 0.5);

    // Container
    this.container = scene.add.container(x, y, [
      this.background,
      this.bar,
      this.text,
    ]);
  }

  /**
   * Update HP bar
   */
  update(current: number, max: number, showText: boolean = true): void {
    const percent = Math.max(0, Math.min(1, current / max));
    this.bar.width = this.width * percent;

    // Color based on HP percentage
    if (percent > 0.6) {
      this.bar.setFillStyle(0x00ff00); // Green
    } else if (percent > 0.3) {
      this.bar.setFillStyle(0xffff00); // Yellow
    } else {
      this.bar.setFillStyle(0xff0000); // Red
    }

    if (showText) {
      this.text.setText(`${Math.floor(current)}/${Math.floor(max)}`);
    }
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Destroy
   */
  destroy(): void {
    this.container.destroy();
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }
}

export class AgentDisplay {
  private scene: Phaser.Scene;
  private agent: Agent;
  private sprite: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private hpBar: HPBar;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, agent: Agent, x: number, y: number) {
    this.scene = scene;
    this.agent = agent;

    // Create sprite (colored rectangle for now)
    this.sprite = scene.add.rectangle(0, 0, 40, 60, agent.color);
    this.sprite.setStrokeStyle(2, 0xffffff);

    // Name text
    this.nameText = scene.add.text(0, -40, agent.name, {
      fontSize: '14px',
      color: '#ffffff',
    });
    this.nameText.setOrigin(0.5, 0.5);

    // HP bar
    this.hpBar = new HPBar(scene, 0, 40, 80, 10);

    // Container
    this.container = scene.add.container(x, y, [
      this.sprite,
      this.nameText,
    ]);

    this.update();
  }

  /**
   * Update display
   */
  update(): void {
    this.hpBar.update(this.agent.hp, this.agent.maxHp);
    this.hpBar.setPosition(this.container.x, this.container.y + 40);

    // Fade out if dead
    if (!this.agent.isAlive()) {
      this.sprite.setAlpha(0.3);
      this.nameText.setAlpha(0.3);
    }

    // Highlight if defending
    if (this.agent.isDefending) {
      this.sprite.setStrokeStyle(3, 0x00ffff);
    } else {
      this.sprite.setStrokeStyle(2, 0xffffff);
    }
  }

  /**
   * Play attack animation
   */
  async playAttack(targetX: number): Promise<void> {
    const startX = this.container.x;

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.container,
        x: targetX - 30,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.container.x = startX;
          resolve();
        },
      });
    });
  }

  /**
   * Play hit animation
   */
  playHit(): void {
    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }

  /**
   * Destroy
   */
  destroy(): void {
    this.container.destroy();
    this.hpBar.destroy();
  }

  getX(): number {
    return this.container.x;
  }

  getY(): number {
    return this.container.y;
  }
}

export class EnemyDisplay {
  private scene: Phaser.Scene;
  private enemy: Enemy;
  private sprite: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private hpBar: HPBar;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, enemy: Enemy, x: number, y: number) {
    this.scene = scene;
    this.enemy = enemy;

    // Create sprite
    this.sprite = scene.add.rectangle(0, 0, 40, 60, enemy.color);
    this.sprite.setStrokeStyle(2, 0xff0000);

    // Name text
    this.nameText = scene.add.text(0, -40, enemy.name, {
      fontSize: '14px',
      color: '#ffffff',
    });
    this.nameText.setOrigin(0.5, 0.5);

    // HP bar
    this.hpBar = new HPBar(scene, 0, 40, 80, 10);

    // Container
    this.container = scene.add.container(x, y, [
      this.sprite,
      this.nameText,
    ]);

    this.update();
  }

  /**
   * Update display
   */
  update(): void {
    this.hpBar.update(this.enemy.hp, this.enemy.maxHp);
    this.hpBar.setPosition(this.container.x, this.container.y + 40);

    // Fade out if dead
    if (!this.enemy.isAlive()) {
      this.sprite.setAlpha(0.3);
      this.nameText.setAlpha(0.3);
    }

    // Highlight if defending
    if (this.enemy.isDefending) {
      this.sprite.setStrokeStyle(3, 0x00ffff);
    } else {
      this.sprite.setStrokeStyle(2, 0xff0000);
    }
  }

  /**
   * Play attack animation
   */
  async playAttack(targetX: number): Promise<void> {
    const startX = this.container.x;

    await new Promise<void>(resolve => {
      this.scene.tweens.add({
        targets: this.container,
        x: targetX + 30,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.container.x = startX;
          resolve();
        },
      });
    });
  }

  /**
   * Play hit animation
   */
  playHit(): void {
    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }

  /**
   * Destroy
   */
  destroy(): void {
    this.container.destroy();
    this.hpBar.destroy();
  }

  getX(): number {
    return this.container.x;
  }

  getY(): number {
    return this.container.y;
  }
}
