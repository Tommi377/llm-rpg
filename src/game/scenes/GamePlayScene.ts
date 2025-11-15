/**
 * Main gameplay scene for event management
 */

import Phaser from "phaser";
import { GameState } from "../GameState";
import { ChatLog } from "../../ui/ChatLog";
import { ChatInput } from "../../ui/ChatInput";
import { AgentDisplay } from "../../ui/GameUI";
import { AgentAI } from "../../agents/AgentAI";
import { EventJudge } from "../../events/EventJudge";
import { GeneratedEvent } from "../../events/EventGenerator";

export class GamePlayScene extends Phaser.Scene {
  private chatLog!: ChatLog;
  private chatInput!: ChatInput;
  private gameState!: GameState;
  private agentDisplays: AgentDisplay[] = [];
  private currentEvent: GeneratedEvent | null = null;

  constructor() {
    super({ key: "GamePlayScene" });
  }

  async create(): Promise<void> {
    this.gameState = GameState.getInstance();
    this.chatLog = new ChatLog();
    this.chatInput = new ChatInput();

    // Show game container
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) gameContainer.classList.remove("hidden");

    // Title
    this.add
      .text(this.cameras.main.centerX, 40, "THE ADVENTURE", {
        fontSize: "32px",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    // Display agents
    this.displayAgents();

    // Welcome
    this.chatLog.addSeparator("NEW ADVENTURE");
    await this.chatLog.streamMessage({
      type: "system",
      content: "Your party embarks on their journey...",
    });

    // Set up input
    this.chatInput.addSubmitButton();
    this.chatInput.onSubmit((doctrine) => {
      this.onDoctrineSubmit(doctrine);
    });

    // Start first event
    this.time.delayedCall(1000, () => {
      this.startNextEvent();
    });
  }

  private displayAgents(): void {
    const startX = 250;
    const spacing = 150;
    const y = 200;

    this.agentDisplays = [];

    this.gameState.agents.forEach((agent, index) => {
      const display = new AgentDisplay(
        this,
        agent,
        startX + index * spacing,
        y,
      );
      this.agentDisplays.push(display);
    });
  }

  private async startNextEvent(): Promise<void> {
    // Check if party is alive
    if (!this.gameState.isPartyAlive()) {
      await this.gameOver();
      return;
    }

    this.gameState.incrementEvent();

    this.chatLog.addSeparator(`EVENT ${this.gameState.eventCount}`);
    await this.chatLog.streamMessage({
      type: "system",
      content: "Generating event...",
    });

    this.chatLog.thinking();

    try {
      // Generate event
      this.currentEvent = await this.gameState.eventGenerator.generateEvent(
        this.gameState.agents.filter((a) => a.isAlive()),
        this.gameState.eventCount,
      );

      this.chatLog.removeThinking();

      await this.handleNormalEvent(this.currentEvent);
    } catch (error) {
      this.chatLog.removeThinking();
      await this.chatLog.streamMessage({
        type: "system",
        content: `Error generating event: ${error}`,
      });
      this.time.delayedCall(2000, () => this.startNextEvent());
    }
  }

  private async handleNormalEvent(event: GeneratedEvent): Promise<void> {
    await this.chatLog.streamMessage({
      type: "system",
      content: event.description,
    });
    if (event.challenge) {
      await this.chatLog.streamMessage({
        type: "system",
        content: `Challenge: ${event.challenge}`,
      });
    }
    await this.chatLog.streamMessage({
      type: "system",
      content: "How will your agents respond? Enter your doctrine below.",
    });

    // Enable input
    this.chatInput.setEnabled(true);
    this.chatInput.focus();
  }

  private async onDoctrineSubmit(doctrine: string): Promise<void> {
    // Disable input
    this.chatInput.setEnabled(false);

    // Update doctrine
    this.gameState.setDoctrine(doctrine);

    await this.chatLog.streamMessage({
      type: "player",
      speaker: "You",
      content: `Doctrine: "${doctrine}"`,
    });
    await this.chatLog.streamMessage({
      type: "system",
      content: "Agents are deciding their actions...",
    });

    if (!this.currentEvent) return;

    try {
      // Get agent decisions
      const decisions = await AgentAI.batchEventDecisions(
        this.gameState.agents,
        this.currentEvent.description,
        doctrine,
        this.gameState.eventGenerator.getHistory().slice(-3),
      );

      // Stream each agent's decision one at a time
      for (const agent of this.gameState.agents.filter((a) => a.isAlive())) {
        const decision = decisions.get(agent.name);
        if (!decision) continue;

        await this.chatLog.streamMessages(
          [
            {
              type: "agent",
              speaker: agent.name,
              content: decision.action,
              color: agent.color,
            },
            // {
            //   type: "agent",
            //   speaker: agent.name,
            //   content: `"${decision.reasoning}"`,
            //   color: agent.color,
            // },
          ],
          agent.name,
          agent.color,
        );
      }

      // Judge outcomes
      await this.chatLog.streamMessage({
        type: "system",
        content: "Judging outcomes...",
      });

      this.chatLog.thinking();

      const agentActions = Array.from(decisions.entries()).map(
        ([name, decision]) => ({
          name,
          action: decision.action,
          reasoning: decision.reasoning,
        }),
      );

      const judgement = await EventJudge.judgeEvent(
        this.currentEvent.description,
        agentActions,
        doctrine,
      );

      this.gameState.eventGenerator.addSummary(judgement.summary);

      this.chatLog.removeThinking();

      // Display results
      await this.chatLog.streamMessage({
        type: "system",
        content: judgement.summary,
      });

      // Apply results
      EventJudge.applyResults(this.gameState.agents, judgement.results);

      // Display feedback
      for (const result of judgement.results) {
        const outcome =
          result.outcome === "good"
            ? "✓"
            : result.outcome === "bad"
              ? "✗"
              : "○";
        await this.chatLog.streamMessage({
          type: "system",
          content: `${outcome} ${result.name}: ${result.feedback}`,
        });

        // Show stat changes
        const changes: string[] = [];
        if (result.statChange.hp > 0 || result.statChange.hp < 0)
          changes.push(
            `HP ${result.statChange.hp > 0 ? "+" : ""}${result.statChange.hp}`,
          );
        if (result.statChange.mind > 0 || result.statChange.mind < 0)
          changes.push(
            `MIND ${result.statChange.mind > 0 ? "+" : ""}${result.statChange.mind}`,
          );

        if (changes.length > 0) {
          await this.chatLog.streamMessage({
            type: "system",
            content: `  Changes: ${changes.join(", ")}`,
          });
        }

        if (result.trauma) {
          await this.chatLog.streamMessage({
            type: "system",
            content: `  ⚠ Trauma: ${result.trauma}`,
          });
        }
      }

      // Update displays
      this.agentDisplays.forEach((display) => display.update());

      // Mark event as cleared
      this.gameState.clearEvent(false);

      // Continue
      await this.chatLog.streamMessage({
        type: "system",
        content: "Continuing...",
      });

      this.time.delayedCall(3000, () => {
        this.startNextEvent();
      });
    } catch (error) {
      await this.chatLog.streamMessage({
        type: "system",
        content: `Error: ${error}`,
      });
      this.chatInput.setEnabled(true);
    }
  }

  private async gameOver(): Promise<void> {
    this.chatLog.addSeparator("GAME OVER");
    await this.chatLog.streamMessage({
      type: "system",
      content: "Your party has been defeated.",
    });
    await this.chatLog.streamMessage({
      type: "system",
      content: this.gameState.getStatsSummary(),
    });

    this.chatInput.setEnabled(false);

    // Game over text
    const gameOverText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      "GAME OVER",
      {
        fontSize: "64px",
        color: "#ff0000",
        fontFamily: "Courier New",
      },
    );
    gameOverText.setOrigin(0.5);

    // Restart button
    const restartButton = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 80,
      "[ RESTART ]",
      {
        fontSize: "24px",
        color: "#00ff00",
        fontFamily: "Courier New",
      },
    );
    restartButton.setOrigin(0.5);
    restartButton.setInteractive({ useHandCursor: true });

    restartButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
  }

  update(): void {
    // Update agent displays
    this.agentDisplays.forEach((display) => display.update());
  }
}
