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
  private selectionBox: Phaser.GameObjects.Rectangle;
  private detailsBox!: Phaser.GameObjects.Container;
  private detailsBackground!: Phaser.GameObjects.Rectangle;
  private detailsTexts!: Phaser.GameObjects.Text[];

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

    // Create selection box (hidden by default)
    this.selectionBox = scene.add.rectangle(0, 0, 110, 110, 0x00ff00, 0);
    this.selectionBox.setStrokeStyle(3, 0xffff00);
    this.selectionBox.setVisible(false);
    this.container.add(this.selectionBox);

    // Create details box (hidden by default)
    this.createDetailsBox();

    // Make container interactive
    this.setupHoverInteraction();

    this.update();
  }

  private createDetailsBox(): void {
    const boxWidth = 500;
    const boxHeight = 280;
    const boxX = 0;
    const boxY = 230; // Position to fill bottom half

    // Background
    this.detailsBackground = this.scene.add.rectangle(
      boxX,
      boxY,
      boxWidth,
      boxHeight,
      0x1a1a1a,
      0.95,
    );
    this.detailsBackground.setStrokeStyle(3, 0xffff00);

    // Text content
    this.detailsTexts = [];

    const titleConfig = {
      fontSize: "14px",
      color: "#ffff00",
      fontStyle: "bold",
      align: "center",
    };

    const textConfig = {
      fontSize: "11px",
      color: "#ffffff",
      wordWrap: { width: boxWidth - 20 },
      align: "left",
      lineSpacing: 4,
    };

    // Title
    const titleText = this.scene.add.text(
      boxX,
      boxY - boxHeight / 2 + 15,
      "AGENT DETAILS",
      titleConfig,
    );
    titleText.setOrigin(0.5, 0);

    // Personality section
    const personalityLabel = this.scene.add.text(
      boxX - boxWidth / 2 + 10,
      boxY - boxHeight / 2 + 45,
      "PERSONALITY:",
      { ...textConfig, color: "#00ffff", fontStyle: "bold" },
    );
    personalityLabel.setOrigin(0, 0);

    const personalityText = this.scene.add.text(
      boxX - boxWidth / 2 + 10,
      boxY - boxHeight / 2 + 65,
      this.agent.personality,
      textConfig,
    );
    personalityText.setOrigin(0, 0);

    // Flaw section
    const flawLabel = this.scene.add.text(
      boxX - boxWidth / 2 + 10,
      boxY - boxHeight / 2 + 125,
      "FLAW:",
      { ...textConfig, color: "#ff6666", fontStyle: "bold" },
    );
    flawLabel.setOrigin(0, 0);

    const flawText = this.scene.add.text(
      boxX - boxWidth / 2 + 10,
      boxY - boxHeight / 2 + 145,
      this.agent.flaw,
      textConfig,
    );
    flawText.setOrigin(0, 0);

    // Signature Skill section
    const skillLabel = this.scene.add.text(
      boxX - boxWidth / 2 + 10,
      boxY - boxHeight / 2 + 205,
      "SIGNATURE SKILL:",
      { ...textConfig, color: "#00ff00", fontStyle: "bold" },
    );
    skillLabel.setOrigin(0, 0);

    const skillText = this.scene.add.text(
      boxX - boxWidth / 2 + 10,
      boxY - boxHeight / 2 + 225,
      this.agent.signatureSkill,
      textConfig,
    );
    skillText.setOrigin(0, 0);

    this.detailsTexts.push(
      titleText,
      personalityLabel,
      personalityText,
      flawLabel,
      flawText,
      skillLabel,
      skillText,
    );

    // Create container for details
    this.detailsBox = this.scene.add.container(0, 0, [
      this.detailsBackground,
      ...this.detailsTexts,
    ]);
    this.detailsBox.setVisible(false);
  }

  private setupHoverInteraction(): void {
    // Make the container interactive
    this.container.setSize(120, 120);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-60, -60, 120, 120),
      Phaser.Geom.Rectangle.Contains,
    );

    // Set cursor to pointer on hover
    this.container.on("pointerover", () => {
      this.scene.input.setDefaultCursor("pointer");
      this.selectionBox.setVisible(true);
      this.detailsBox.setVisible(true);
    });

    this.container.on("pointerout", () => {
      this.scene.input.setDefaultCursor("default");
      this.selectionBox.setVisible(false);
      this.detailsBox.setVisible(false);
    });
  }

  update(): void {
    this.hpBar.update(this.agent.hp, this.agent.maxHp);
    this.hpBar.setPosition(this.container.x - 40, this.container.y + 60);

    this.mindBar.update(this.agent.mind, this.agent.maxMind);
    this.mindBar.setPosition(this.container.x - 40, this.container.y + 75);

    // Position details box relative to container
    this.detailsBox.setPosition(this.container.x, this.container.y);

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
    this.detailsBox.destroy();
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
