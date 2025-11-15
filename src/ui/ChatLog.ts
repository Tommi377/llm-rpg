/**
 * Chat log UI component
 * Displays game events, agent thoughts, and combat logs
 */

export interface ChatMessage {
  type: 'system' | 'agent' | 'player' | 'combat';
  speaker?: string;
  content: string;
  timestamp?: number;
}

export class ChatLog {
  private container: HTMLElement;
  private messages: ChatMessage[];
  private autoScroll: boolean;

  constructor(containerId: string = 'chat-log') {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Chat log container '${containerId}' not found`);
    }

    this.container = element;
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
      type: 'system',
      content,
    });
  }

  /**
   * Add an agent message (thought/action)
   */
  agent(speaker: string, content: string): void {
    this.addMessage({
      type: 'agent',
      speaker,
      content,
    });
  }

  /**
   * Add a player message (doctrine)
   */
  player(content: string): void {
    this.addMessage({
      type: 'player',
      speaker: 'You',
      content,
    });
  }

  /**
   * Add a combat message
   */
  combat(content: string): void {
    this.addMessage({
      type: 'combat',
      content,
    });
  }

  /**
   * Add a thinking indicator
   */
  thinking(agent?: string): HTMLElement {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'chat-message agent thinking';
    thinkingDiv.innerHTML = `
      <div class="chat-speaker">${agent || 'AI'}</div>
      <div class="chat-content">Thinking...</div>
    `;
    this.container.appendChild(thinkingDiv);
    this.scrollToBottom();
    return thinkingDiv;
  }

  /**
   * Remove a thinking indicator
   */
  removeThinking(element: HTMLElement): void {
    element.remove();
  }

  /**
   * Render a single message
   */
  private renderMessage(message: ChatMessage): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.type}`;

    let html = '';

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
    this.container.innerHTML = '';
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Export chat history as text
   */
  exportHistory(): string {
    return this.messages
      .map(m => {
        const speaker = m.speaker ? `${m.speaker}: ` : '';
        return `[${m.type.toUpperCase()}] ${speaker}${m.content}`;
      })
      .join('\n');
  }

  /**
   * Get recent messages for context
   */
  getRecentMessages(count: number = 10): ChatMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Add multiple messages at once (for batch updates)
   */
  addBatch(messages: ChatMessage[]): void {
    const oldAutoScroll = this.autoScroll;
    this.autoScroll = false;

    messages.forEach(msg => this.addMessage(msg));

    this.autoScroll = oldAutoScroll;
    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Add a separator line
   */
  addSeparator(text?: string): void {
    const separator = document.createElement('div');
    separator.className = 'chat-separator';
    separator.style.cssText = `
      margin: 16px 0;
      padding: 8px;
      text-align: center;
      border-top: 1px solid #444;
      border-bottom: 1px solid #444;
      font-style: italic;
      color: #888;
    `;
    separator.textContent = text || '---';
    this.container.appendChild(separator);
    this.scrollToBottom();
  }
}
