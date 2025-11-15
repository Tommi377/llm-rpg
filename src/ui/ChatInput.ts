/**
 * Chat input UI component
 * Handles player doctrine input
 */

export type DoctrineSubmitCallback = (doctrine: string) => void;

export class ChatInput {
  private input: HTMLTextAreaElement;
  private callback: DoctrineSubmitCallback | null;
  private history: string[];
  private historyIndex: number;
  private enabled: boolean;

  constructor(inputId: string = 'chat-input') {
    const element = document.getElementById(inputId) as HTMLTextAreaElement;
    if (!element) {
      throw new Error(`Chat input '${inputId}' not found`);
    }

    this.input = element;
    this.callback = null;
    this.history = [];
    this.historyIndex = -1;
    this.enabled = true;

    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Submit on Ctrl+Enter or Cmd+Enter
    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }

      // History navigation with up/down arrows
      if (e.key === 'ArrowUp' && this.history.length > 0) {
        e.preventDefault();
        this.historyIndex = Math.max(0, this.historyIndex - 1);
        this.input.value = this.history[this.historyIndex] || '';
      } else if (e.key === 'ArrowDown' && this.history.length > 0) {
        e.preventDefault();
        this.historyIndex = Math.min(this.history.length, this.historyIndex + 1);
        this.input.value = this.history[this.historyIndex] || '';
      }
    });

    // Also allow form submission if wrapped in a form
    const form = this.input.closest('form');
    if (form) {
      form.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        this.submit();
      });
    }
  }

  /**
   * Submit the current doctrine
   */
  private submit(): void {
    if (!this.enabled) return;

    const value = this.input.value.trim();

    if (!value) return;

    // Add to history
    this.history.push(value);
    this.historyIndex = this.history.length;

    // Call callback
    if (this.callback) {
      this.callback(value);
    }

    // Don't clear - let the game logic decide when to clear
  }

  /**
   * Set the submit callback
   */
  onSubmit(callback: DoctrineSubmitCallback): void {
    this.callback = callback;
  }

  /**
   * Get current doctrine value
   */
  getValue(): string {
    return this.input.value.trim();
  }

  /**
   * Set doctrine value
   */
  setValue(value: string): void {
    this.input.value = value;
  }

  /**
   * Clear the input
   */
  clear(): void {
    this.input.value = '';
  }

  /**
   * Enable/disable input
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.input.disabled = !enabled;

    if (enabled) {
      this.input.placeholder =
        'Enter your doctrine for the agents...';
    } else {
      this.input.placeholder = 'Waiting for agents to act...';
    }
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.input.focus();
  }

  /**
   * Get doctrine history
   */
  getHistory(): string[] {
    return [...this.history];
  }

  /**
   * Set a prompt in the input
   */
  setPrompt(prompt: string): void {
    this.input.value = prompt;
    this.input.focus();
  }

  /**
   * Add a submit button if one doesn't exist
   */
  addSubmitButton(): HTMLButtonElement {
    const container = this.input.parentElement;
    if (!container) {
      throw new Error('Input has no parent container');
    }

    // Check if button already exists
    let button = container.querySelector('.submit-button') as HTMLButtonElement;

    if (!button) {
      button = document.createElement('button');
      button.className = 'submit-button';
      button.textContent = 'Submit (Ctrl+Enter)';
      button.style.cssText = `
        width: 100%;
        padding: 12px;
        margin-top: 8px;
        background: #00ff00;
        color: #000;
        border: none;
        font-family: inherit;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.background = '#00cc00';
      });

      button.addEventListener('mouseleave', () => {
        button.style.background = '#00ff00';
      });

      button.addEventListener('click', () => {
        this.submit();
      });

      container.appendChild(button);
    }

    return button;
  }
}
