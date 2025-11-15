/**
 * Chat log UI component
 * Displays game events, agent thoughts, and combat logs
 */

export interface ChatMessage {
  type: "system" | "agent" | "player" | "combat";
  speaker?: string;
  content: string;
  timestamp?: number;
  color?: number; // Agent color in hex format
}

export class ChatLog {
  private container: HTMLElement;
  private thinkingArea: HTMLElement;
  private thinkingAgentSpan: HTMLElement;
  private messages: ChatMessage[];
  private autoScroll: boolean;

  constructor(containerId: string = "chat-log") {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Chat log container '${containerId}' not found`);
    }

    const thinkingArea = document.getElementById("thinking-area");
    if (!thinkingArea) {
      throw new Error(`Thinking area not found`);
    }

    const thinkingAgentSpan = thinkingArea.querySelector(
      ".thinking-agent",
    ) as HTMLElement;
    if (!thinkingAgentSpan) {
      throw new Error(`Thinking agent span not found`);
    }

    this.container = element;
    this.thinkingArea = thinkingArea;
    this.thinkingAgentSpan = thinkingAgentSpan;
    this.messages = [];
    this.autoScroll = true;
  }

  /**
   * Add a message to the chat log
   */
  addMessage(message: ChatMessage): void {
    message.timestamp = Date.now();
    this.messages.push(message);
    this.renderMessage(message);

    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Add a system message
   */
  system(content: string): void {
    this.addMessage({
      type: "system",
      content,
    });
  }

  /**
   * Add an agent message (thought/action)
   */
  agent(speaker: string, content: string, color?: number): void {
    this.addMessage({
      type: "agent",
      speaker,
      content,
      color,
    });
  }

  /**
   * Add a player message (doctrine)
   */
  player(content: string): void {
    this.addMessage({
      type: "player",
      speaker: "You",
      content,
    });
  }

  /**
   * Add a combat message
   */
  combat(content: string): void {
    this.addMessage({
      type: "combat",
      content,
    });
  }

  /**
   * Show thinking indicator in dedicated area
   */
  thinking(agent?: string, color?: number): void {
    // Set agent name
    this.thinkingAgentSpan.textContent = agent || "Game Master";

    // Set color if provided
    if (color !== undefined) {
      const hexColor = "#" + color.toString(16).padStart(6, "0");
      this.thinkingAgentSpan.style.color = hexColor;
    } else {
      this.thinkingAgentSpan.style.color = "#fff";
    }

    // Show thinking area
    this.thinkingArea.classList.remove("hidden");
  }

  /**
   * Hide thinking indicator
   */
  removeThinking(): void {
    this.thinkingArea.classList.add("hidden");
  }

  /**
   * Render a single message
   */
  private renderMessage(message: ChatMessage): void {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${message.type}`;

    // If agent message with color, override background
    if (message.type === "agent" && message.color !== undefined) {
      const hexColor = "#" + message.color.toString(16).padStart(6, "0");
      messageDiv.style.backgroundColor = hexColor;
    }

    let html = "";

    if (message.speaker) {
      html += `<div class="chat-speaker">${message.speaker}</div>`;
    }

    html += `<div class="chat-content">${this.escapeHtml(message.content)}</div>`;

    messageDiv.innerHTML = html;
    this.container.appendChild(messageDiv);
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
    this.container.innerHTML = "";
  }

  /**
   * Scroll to bottom of chat
   */
  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Export chat history as text
   */
  exportHistory(): string {
    return this.messages
      .map((m) => {
        const speaker = m.speaker ? `${m.speaker}: ` : "";
        return `[${m.type.toUpperCase()}] ${speaker}${m.content}`;
      })
      .join("\n");
  }

  /**
   * Get recent messages for context
   */
  getRecentMessages(count: number = 10): ChatMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Calculate delay based on text length (simulating reading/typing time)
   * Returns delay in milliseconds
   */
  private calculateDelay(text: string): number {
    // Base delay: 20ms per character, min 300ms, max 2000ms
    const baseDelay = Math.min(Math.max(text.length * 20, 300), 2000);
    return baseDelay;
  }

  /**
   * Stream a single message with thinking indicator and delay
   * Shows thinking indicator, displays message, then removes indicator
   */
  async streamMessage(
    message: ChatMessage,
    thinkingAgent?: string,
    thinkingColor?: number,
  ): Promise<void> {
    // Show thinking indicator
    this.thinking(thinkingAgent, thinkingColor);

    // Small delay before showing message
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Display message
    this.addMessage(message);

    // Wait based on message length
    const delay = this.calculateDelay(message.content);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Remove thinking indicator
    this.removeThinking();
  }

  /**
   * Stream messages one by one with delays
   * Shows thinking indicator until all messages are displayed
   */
  async streamMessages(
    messages: ChatMessage[],
    thinkingAgent?: string,
    thinkingColor?: number,
  ): Promise<void> {
    if (messages.length === 0) return;

    // Show thinking indicator
    this.thinking(thinkingAgent, thinkingColor);

    // Display messages one by one with delays
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Wait before showing next message
      if (i > 0) {
        const previousMessage = messages[i - 1];
        const delay = this.calculateDelay(previousMessage.content);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      this.addMessage(message);
    }

    // Wait a bit after last message
    const lastMessage = messages[messages.length - 1];
    await new Promise((resolve) =>
      setTimeout(resolve, this.calculateDelay(lastMessage.content) * 0.5),
    );

    // Remove thinking indicator
    this.removeThinking();
  }

  /**
   * Add multiple messages at once (for batch updates)
   */
  addBatch(messages: ChatMessage[]): void {
    const oldAutoScroll = this.autoScroll;
    this.autoScroll = false;

    messages.forEach((msg) => this.addMessage(msg));

    this.autoScroll = oldAutoScroll;
    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Add a separator line
   */
  addSeparator(text?: string): void {
    const separator = document.createElement("div");
    separator.className = "chat-separator";
    separator.style.cssText = `
      margin: 16px 0;
      padding: 8px;
      text-align: center;
      border-top: 1px solid #444;
      border-bottom: 1px solid #444;
      font-style: italic;
      color: #888;
    `;
    separator.textContent = text || "---";
    this.container.appendChild(separator);
    this.scrollToBottom();
  }
}
