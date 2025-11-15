/**
 * In-game UI components for Phaser
 * HP bars, status displays, etc.
 */

import Phaser from "phaser";
import { Agent } from "../agents/Agent";
import { Enemy } from "../combat/Enemy";

export class HPBar {
  private width: number;
  private background: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;
  private colorScheme: "health" | "mind";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 100,
    height: number = 12,
    colorScheme: "health" | "mind" = "health",
  ) {
    this.width = width;
    this.colorScheme = colorScheme;

    this.background = scene.add.rectangle(0, 0, width, height, 0x333333);
    this.background.setOrigin(0, 0.5);
    this.background.setStrokeStyle(1, 0xffffff);

    const initialColor = colorScheme === "mind" ? 0x00ccff : 0x00ff00;
    this.bar = scene.add.rectangle(0, 0, width, height, initialColor);
    this.bar.setOrigin(0, 0.5);

    this.text = scene.add.text(width / 2, 0, "", {
      fontSize: "10px",
      color: "#f01b1bff",
    });
    this.text.setOrigin(0.5, 0.5);

    this.container = scene.add.container(x, y, [
      this.background,
      this.bar,
      this.text,
    ]);
  }

  update(current: number, max: number, showText: boolean = true): void {
    const percent = Math.max(0, Math.min(1, current / max));
    this.bar.width = this.width * percent;

    if (this.colorScheme === "mind") {
      // Mind bar: cyan -> blue -> purple
      if (percent > 0.6)
        this.bar.setFillStyle(0x00ccff); // Cyan
      else if (percent > 0.3)
        this.bar.setFillStyle(0x0088ff); // Blue
      else this.bar.setFillStyle(0x8800ff); // Purple
    } else {
      // Health bar: green -> yellow -> red
      if (percent > 0.6) this.bar.setFillStyle(0x00ff00);
      else if (percent > 0.3) this.bar.setFillStyle(0xffff00);
      else this.bar.setFillStyle(0xff0000);
    }

    if (showText)
      this.text.setText(`${Math.floor(current)}/${Math.floor(max)}`);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }
}

export class AgentDisplay {
  private scene: Phaser.Scene;
  private agent: Agent;
  private sprite: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private hpBar: HPBar;
  private mindBar: HPBar;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, agent: Agent, x: number, y: number) {
    this.scene = scene;
    this.agent = agent;

    this.sprite = scene.add.image(0, 0, agent.spriteKey || "default");
    this.sprite.setOrigin(0.5, 0.5);

    // Cap height at 100px, keep aspect ratio
    const maxHeight = 100;
    const scale = maxHeight / this.sprite.height;
    this.sprite.setScale(scale);

    this.nameText = scene.add
      .text(0, -65, agent.name, {
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);

    this.hpBar = new HPBar(scene, 0, 60, 80, 10, "health");
    this.mindBar = new HPBar(scene, 0, 75, 80, 10, "mind");

    this.container = scene.add.container(x, y, [this.sprite, this.nameText]);

    this.update();
  }

  update(): void {
    this.hpBar.update(this.agent.hp, this.agent.maxHp);
    this.hpBar.setPosition(this.container.x - 40, this.container.y + 60);

    this.mindBar.update(this.agent.mind, this.agent.maxMind);
    this.mindBar.setPosition(this.container.x - 40, this.container.y + 75);

    if (!this.agent.isAlive()) {
      this.sprite.setTint(0x666666);
      this.nameText.setAlpha(0.4);
    }

    if (this.agent.isDefending) this.sprite.setTint(0x00ffff);
    else this.sprite.clearTint();
  }

  async playAttack(targetX: number): Promise<void> {
    const startX = this.container.x;
    await new Promise<void>((resolve) => {
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

  playHit(): void {
    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }

  destroy(): void {
    this.container.destroy();
    this.hpBar.destroy();
    this.mindBar.destroy();
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
  private sprite: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private hpBar: HPBar;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, enemy: Enemy, x: number, y: number) {
    this.scene = scene;
    this.enemy = enemy;

    this.sprite = scene.add.image(0, 0, enemy.spriteKey || "default");
    this.sprite.setOrigin(0.5, 0.5);

    // Cap height at 100px, keep aspect ratio
    const maxHeight = 80;
    const scale = maxHeight / this.sprite.height;
    this.sprite.setScale(scale);

    this.nameText = scene.add
      .text(0, -65, enemy.name, {
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);

    this.hpBar = new HPBar(scene, 0, 60, 80, 10);

    this.container = scene.add.container(x, y, [this.sprite, this.nameText]);

    this.update();
  }

  update(): void {
    this.hpBar.update(this.enemy.hp, this.enemy.maxHp);
    this.hpBar.setPosition(this.container.x, this.container.y + 60);

    if (!this.enemy.isAlive()) {
      this.sprite.setTint(0x666666);
      this.nameText.setAlpha(0.4);
    }

    if (this.enemy.isDefending) this.sprite.setTint(0x00ffff);
    else this.sprite.clearTint();
  }

  async playAttack(targetX: number): Promise<void> {
    const startX = this.container.x;
    await new Promise<void>((resolve) => {
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

  playHit(): void {
    this.scene.tweens.add({
      targets: [this.sprite, this.nameText],
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }

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
