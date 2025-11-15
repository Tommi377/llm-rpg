/**
 * Represents an autonomous agent in the game
 * Each agent has stats, personality, and makes decisions via LLM
 */

export interface AgentStats {
  hp: number;
  maxHp: number;
  attack: number;
  mind: number;
}

export interface AgentPersonality {
  personality: string;
  flaw: string;
  signatureSkill: string;
}

export interface AgentData extends AgentStats, AgentPersonality {
  name: string;
  trauma: string[];
  isDefending: boolean;
  spriteKey?: string;
}

export class Agent {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  mind: number;
  personality: string;
  flaw: string;
  signatureSkill: string;
  trauma: string[];
  isDefending: boolean;

  /** Sprite graphics key (replaces color visuals) */
  spriteKey: string;

  /** Optional fallback color if no sprite */
  color: number;

  constructor(name: string, color: number = 0x00ff00, spriteKey: string = 'default-agent') {
    this.name = name;
    this.hp = 100;
    this.maxHp = 100;
    this.attack = 5;
    this.mind = 5;
    this.personality = '';
    this.flaw = '';
    this.signatureSkill = '';
    this.trauma = [];
    this.isDefending = false;

    this.color = color;
    this.spriteKey = spriteKey; // NEW
  }

  /**
   * Set sprite graphics
   */
  setSprite(key: string): void {
    this.spriteKey = key;
  }

  /**
   * Set the agent's personality profile
   */
  setPersonality(profile: AgentPersonality): void {
    this.personality = profile.personality;
    this.flaw = profile.flaw;
    this.signatureSkill = profile.signatureSkill;
  }

  /**
   * Check if agent is alive
   */
  isAlive(): boolean {
    return this.hp > 0;
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): number {
    const actualDamage = this.isDefending ? Math.floor(amount * 0.5) : amount;
    this.hp = Math.max(0, this.hp - actualDamage);
    this.isDefending = false;
    return actualDamage;
  }

  /**
   * Heal
   */
  heal(amount: number): number {
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - oldHp;
  }

  /**
   * Set defending status
   */
  defend(): void {
    this.isDefending = true;
  }

  /**
   * Reset defending status (called at start of turn)
   */
  resetDefense(): void {
    this.isDefending = false;
  }

  /**
   * Add trauma
   */
  addTrauma(trauma: string): void {
    if (!this.trauma.includes(trauma)) {
      this.trauma.push(trauma);
    }
  }

  /**
   * Modify stats
   */
  modifyStats(changes: { hp?: number; attack?: number; mind?: number }): void {
    if (changes.hp !== undefined) {
      this.hp = Math.max(0, Math.min(this.maxHp, this.hp + changes.hp));
    }
    if (changes.attack !== undefined) {
      this.attack = Math.max(1, this.attack + changes.attack);
    }
    if (changes.mind !== undefined) {
      this.mind = Math.max(1, this.mind + changes.mind);
    }
  }

  /**
   * Get a stat summary string
   */
  getStatsSummary(): string {
    return `${this.name} | HP: ${this.hp}/${this.maxHp} | ATT: ${this.attack} | MIND: ${this.mind}`;
  }

  /**
   * Get full profile as JSON
   */
  toJSON(): AgentData {
    return {
      name: this.name,
      hp: this.hp,
      maxHp: this.maxHp,
      attack: this.attack,
      mind: this.mind,
      personality: this.personality,
      flaw: this.flaw,
      signatureSkill: this.signatureSkill,
      trauma: [...this.trauma],
      isDefending: this.isDefending,
      spriteKey: this.spriteKey, // NEW
    };
  }

  /**
   * Load from JSON
   */
  static fromJSON(data: AgentData, color: number = 0x00ff00): Agent {
    const agent = new Agent(data.name, color, data.spriteKey ?? 'default-agent');
    agent.hp = data.hp;
    agent.maxHp = data.maxHp;
    agent.attack = data.attack;
    agent.mind = data.mind;
    agent.personality = data.personality;
    agent.flaw = data.flaw;
    agent.signatureSkill = data.signatureSkill;
    agent.trauma = [...data.trauma];
    agent.isDefending = data.isDefending;
    return agent;
  }

  /**
   * Create a new agent with random starting stats
   */
  static createRandom(name: string, color: number = 0x00ff00): Agent {
    const agent = new Agent(name, color);

    agent.maxHp = 80 + Math.floor(Math.random() * 40); // 80-120
    agent.hp = agent.maxHp;
    agent.attack = 3 + Math.floor(Math.random() * 5); // 3-7
    agent.mind = 3 + Math.floor(Math.random() * 5); // 3-7

    return agent;
  }
}
