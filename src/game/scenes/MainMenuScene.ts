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
      content: "Welcome to captAIn!",
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
    const title = this.add.text(this.cameras.main.centerX, 100, "captAIn", {
      fontSize: "48px",
      color: "#00ff00",
      fontFamily: "Courier New",
    });
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
      // Show provider selection first
      await this.chatLog.streamMessage({
        type: "system",
        content: "Please select your LLM provider:",
      });

      this.showProviderSelection();
    } catch (error) {
      await this.chatLog.streamMessage({
        type: "system",
        content: `Error: ${error}`,
      });
    }
  }

  private showProviderSelection(): void {
    const centerX = this.cameras.main.centerX;
    let currentY = 250;

    // Provider selection
    const providerText = this.add
      .text(centerX, currentY, "Select Provider:", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    currentY += 40;

    // Create provider buttons
    const ollamaButton = this.add
      .text(centerX - 100, currentY, "[ Local Ollama ]", {
        fontSize: "18px",
        color: "#00ff00",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    const groqButton = this.add
      .text(centerX + 100, currentY, "[ Groq API ]", {
        fontSize: "18px",
        color: "#00ff00",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    // Highlight current selection
    const currentProvider = ollama.getProvider();
    if (currentProvider === "ollama") {
      ollamaButton.setScale(1.1);
      ollamaButton.setColor("#ffff00");
    } else {
      groqButton.setScale(1.1);
      groqButton.setColor("#ffff00");
    }

    // Make buttons interactive
    ollamaButton.setInteractive({ useHandCursor: true });
    groqButton.setInteractive({ useHandCursor: true });

    ollamaButton.on("pointerover", () => {
      ollamaButton.setScale(1.2);
    });

    ollamaButton.on("pointerout", () => {
      ollamaButton.setScale(currentProvider === "ollama" ? 1.1 : 1);
    });

    groqButton.on("pointerover", () => {
      groqButton.setScale(1.2);
    });

    groqButton.on("pointerout", () => {
      groqButton.setScale(currentProvider === "groq" ? 1.1 : 1);
    });

    // Create API key input container (initially hidden)
    const apiKeyContainer = document.createElement("div");
    apiKeyContainer.style.cssText = `
      position: absolute;
      left: 50%;
      top: ${currentY + 60}px;
      transform: translateX(-50%);
      z-index: 100;
      display: ${currentProvider === "groq" ? "block" : "none"};
    `;

    const apiKeyInput = document.createElement("input");
    apiKeyInput.type = "password";
    apiKeyInput.placeholder = "Enter Groq API Key";
    apiKeyInput.value = ollama.getStoredApiKey() || "";
    apiKeyInput.style.cssText = `
      padding: 10px;
      font-size: 16px;
      font-family: 'Courier New', monospace;
      background: #333;
      color: #fff;
      border: 2px solid #00ff00;
      width: 300px;
      text-align: center;
    `;

    apiKeyContainer.appendChild(apiKeyInput);
    document.body.appendChild(apiKeyContainer);

    // Continue button
    const continueButton = this.add
      .text(centerX, currentY + 120, "[ CONTINUE ]", {
        fontSize: "24px",
        color: "#00ff00",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    continueButton.setInteractive({ useHandCursor: true });

    continueButton.on("pointerover", () => {
      continueButton.setScale(1.1);
    });

    continueButton.on("pointerout", () => {
      continueButton.setScale(1);
    });

    // Handle provider selection
    let selectedProvider: "ollama" | "groq" = currentProvider;

    ollamaButton.on("pointerdown", () => {
      selectedProvider = "ollama";
      ollamaButton.setColor("#ffff00");
      ollamaButton.setScale(1.1);
      groqButton.setColor("#00ff00");
      groqButton.setScale(1);
      apiKeyContainer.style.display = "none";
    });

    groqButton.on("pointerdown", () => {
      selectedProvider = "groq";
      groqButton.setColor("#ffff00");
      groqButton.setScale(1.1);
      ollamaButton.setColor("#00ff00");
      ollamaButton.setScale(1);
      apiKeyContainer.style.display = "block";
    });

    continueButton.on("pointerdown", async () => {
      // Set provider and API key
      if (selectedProvider === "groq") {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
          await this.chatLog.streamMessage({
            type: "system",
            content: "Please enter your Groq API key!",
          });
          return;
        }
        ollama.setProvider("groq", apiKey);
        ollama.storeProvider("groq");
      } else {
        ollama.setProvider("ollama");
        ollama.storeProvider("ollama");
      }

      // Clean up UI
      providerText.destroy();
      ollamaButton.destroy();
      groqButton.destroy();
      continueButton.destroy();
      apiKeyContainer.remove();

      // Check connection
      await this.checkConnectionAndProceed();
    });
  }

  private async checkConnectionAndProceed(): Promise<void> {
    const provider = ollama.getProvider();
    const providerName = provider === "ollama" ? "Ollama" : "Groq";

    await this.chatLog.streamMessage({
      type: "system",
      content: `Checking ${providerName} connection...`,
    });

    const isConnected = await ollama.checkConnection();

    if (!isConnected) {
      await this.chatLog.streamMessage({
        type: "system",
        content: `ERROR: Could not connect to ${providerName}!`,
      });

      if (provider === "ollama") {
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
      } else {
        await this.chatLog.streamMessage({
          type: "system",
          content: "Please check your API key and try again.",
        });
        await this.chatLog.streamMessage({
          type: "system",
          content: "Get your key at: https://console.groq.com/keys",
        });
      }
      return;
    }

    await this.chatLog.streamMessage({
      type: "system",
      content: `✓ Connected to ${providerName}`,
    });

    // List available models
    const models = await ollama.listModels();
    // if (models.length > 0) {
    //   await this.chatLog.streamMessage({
    //     type: "system",
    //     content: `Using model: ${models[0]}`,
    //   });
    // }

    await this.chatLog.streamMessage({
      type: "system",
      content: "Creating your party of 3 agents...",
    });

    // Create input forms for agent names
    this.showAgentNameInput();
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
              content: `Stats: HP ${agent.maxHp} | MIND ${agent.maxMind}`,
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
