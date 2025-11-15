/**
 * Main menu scene for party setup
 */

import Phaser from "phaser";
import { Agent } from "../../agents/Agent";
import { AgentAI } from "../../agents/AgentAI";
import { GameState } from "../GameState";
import { ChatLog } from "../../ui/ChatLog";
import { ollama } from "../../llm/OllamaClient";

export class MainMenuScene extends Phaser.Scene {
  private chatLog!: ChatLog;
  private gameState!: GameState;
  private agentNames: string[] = [];
  private agentColors: number[] = [0x005000, 0x0088ff, 0xff00ff];

  constructor() {
    super({ key: "MainMenuScene" });
  }

  async create(): Promise<void> {
    this.gameState = GameState.getInstance();
    this.gameState.reset();

    // Get chat log
    this.chatLog = new ChatLog();
    this.chatLog.clear();

    // Welcome message
    await this.chatLog.streamMessage({
      type: "system",
      content: "Welcome to LLM Squad RPG!",
    });
    await this.chatLog.streamMessage({
      type: "system",
      content:
        "In this game, your squad of agents acts autonomously based on AI reasoning.",
    });
    await this.chatLog.streamMessage({
      type: "system",
      content: "You can guide them with strategic instructions.",
    });
    await this.chatLog.streamMessage({
      type: "system",
      content:
        "First, let's check your Ollama connection and create your party...",
    });

    // Draw title
    const title = this.add.text(
      this.cameras.main.centerX,
      100,
      "LLM SQUAD RPG",
      {
        fontSize: "48px",
        color: "#00ff00",
        fontFamily: "Courier New",
      },
    );
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(
      this.cameras.main.centerX,
      160,
      "Autonomous AI-Powered Adventurers",
      {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Courier New",
      },
    );
    subtitle.setOrigin(0.5);

    // Start initialization
    this.time.delayedCall(500, () => {
      this.initializeGame();
    });
  }

  private async initializeGame(): Promise<void> {
    try {
      // Check Ollama connection
      await this.chatLog.streamMessage({
        type: "system",
        content: "Checking Ollama connection...",
      });

      const isConnected = await ollama.checkConnection();

      if (!isConnected) {
        await this.chatLog.streamMessage({
          type: "system",
          content: "ERROR: Could not connect to Ollama!",
        });
        await this.chatLog.streamMessage({
          type: "system",
          content: "Please make sure Ollama is running:",
        });
        await this.chatLog.streamMessage({
          type: "system",
          content: "1. Install Ollama from https://ollama.ai",
        });
        await this.chatLog.streamMessage({
          type: "system",
          content: "2. Run: ollama run llama3.2",
        });
        await this.chatLog.streamMessage({
          type: "system",
          content: "3. Keep it running and refresh this page",
        });
        return;
      }

      await this.chatLog.streamMessage({
        type: "system",
        content: "✓ Connected to Ollama",
      });

      // List available models
      const models = await ollama.listModels();
      if (models.length > 0) {
        await this.chatLog.streamMessage({
          type: "system",
          content: `Available models: ${models.join(", ")}`,
        });
      }

      await this.chatLog.streamMessage({
        type: "system",
        content: "Creating your party of 3 agents...",
      });

      // Create input forms for agent names
      this.showAgentNameInput();
    } catch (error) {
      await this.chatLog.streamMessage({
        type: "system",
        content: `Error: ${error}`,
      });
    }
  }

  private showAgentNameInput(): void {
    const centerX = this.cameras.main.centerX;
    let currentY = 200;

    this.add
      .text(centerX, currentY, "Name Your Agents:", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    currentY += 50;

    const inputFields: HTMLInputElement[] = [];

    // Create 3 input fields
    for (let i = 0; i < 3; i++) {
      const inputContainer = document.createElement("div");
      inputContainer.style.cssText = `
        position: absolute;
        left: calc(50% - 140px);
        top: ${currentY + i * 60 + 100}px;
        transform: translateX(-50%);
        z-index: 100;
      `;

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Agent ${i + 1} Name`;
      input.value = `Agent${i + 1}`;
      input.style.cssText = `
        padding: 10px;
        font-size: 16px;
        font-family: 'Courier New', monospace;
        background: #333;
        color: #fff;
        border: 2px solid #00ff00;
        width: 200px;
        text-align: center;
      `;

      inputContainer.appendChild(input);
      document.body.appendChild(inputContainer);
      inputFields.push(input);
    }

    // Create start button
    const buttonY = currentY + 3 * 60 + 30;
    const startButton = this.add
      .text(centerX, buttonY, "[ START ADVENTURE ]", {
        fontSize: "24px",
        color: "#00ff00",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    startButton.setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => {
      startButton.setColor("#00ff00");
      startButton.setScale(1.1);
    });

    startButton.on("pointerout", () => {
      startButton.setColor("#00ff00");
      startButton.setScale(1);
    });

    startButton.on("pointerdown", async () => {
      // Get names
      this.agentNames = inputFields.map(
        (input) =>
          input.value.trim() || `Agent${inputFields.indexOf(input) + 1}`,
      );

      // Remove input fields
      inputFields.forEach((input) => input.parentElement?.remove());
      startButton.destroy();

      await this.createParty();
    });
  }

  private async createParty(): Promise<void> {
    await this.chatLog.streamMessage({
      type: "system",
      content: "Generating agent personalities...",
    });

    const agents: Agent[] = [];

    for (let i = 0; i < this.agentNames.length; i++) {
      const name = this.agentNames[i];
      const color = this.agentColors[i];

      await this.chatLog.streamMessage({
        type: "system",
        content: `Creating ${name}...`,
      });

      try {
        // Create agent
        const agent = Agent.createRandom(name, color);

        // Generate personality
        const personality = await AgentAI.generatePersonality(name);
        agent.setPersonality(personality);

        // Stream the personality info with thinking indicator
        await this.chatLog.streamMessages(
          [
            {
              type: "agent",
              speaker: name,
              content: `Personality: ${personality.personality}`,
              color,
            },
            {
              type: "agent",
              speaker: name,
              content: `Flaw: ${personality.flaw}`,
              color,
            },
            {
              type: "agent",
              speaker: name,
              content: `Signature Skill: ${personality.signatureSkill}`,
              color,
            },
            {
              type: "system",
              content: `Stats: HP ${agent.maxHp} | MIND ${agent.mind}`,
            },
          ],
          name,
          color,
        );

        agents.push(agent);
      } catch (error) {
        await this.chatLog.streamMessage({
          type: "system",
          content: `Error creating ${name}: ${error}`,
        });
      }
    }

    if (agents.length === 0) {
      await this.chatLog.streamMessage({
        type: "system",
        content: "Failed to create party. Please refresh and try again.",
      });
      return;
    }

    // Set game state
    this.gameState.setAgents(agents);

    await this.chatLog.streamMessage({
      type: "system",
      content: "Party created successfully!",
    });
    await this.chatLog.streamMessage({
      type: "system",
      content: "Your adventure begins...",
    });

    // Transition to gameplay
    this.time.delayedCall(2000, () => {
      this.scene.start("GamePlayScene");
    });
  }
}
