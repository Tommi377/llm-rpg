/**
 * Global game state shared across scenes
 */

import { Agent } from '../agents/Agent';
import { EventGenerator } from '../events/EventGenerator';

export interface GameData {
  agents: Agent[];
  doctrine: string;
  eventCount: number;
  eventsCleared: number;
  combatsWon: number;
  eventGenerator: EventGenerator;
}

export class GameState {
  private static instance: GameState;

  agents: Agent[];
  doctrine: string;
  eventCount: number;
  eventsCleared: number;
  combatsWon: number;
  eventGenerator: EventGenerator;

  private constructor() {
    this.agents = [];
    this.doctrine = 'Act with caution and prioritize survival.';
    this.eventCount = 0;
    this.eventsCleared = 0;
    this.combatsWon = 0;
    this.eventGenerator = new EventGenerator();
  }

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  /**
   * Reset game state
   */
  reset(): void {
    this.agents = [];
    this.doctrine = 'Act with caution and prioritize survival.';
    this.eventCount = 0;
    this.eventsCleared = 0;
    this.combatsWon = 0;
    this.eventGenerator.clearHistory();
  }

  /**
   * Set the party
   */
  setAgents(agents: Agent[]): void {
    this.agents = agents;
  }

  /**
   * Update doctrine
   */
  setDoctrine(doctrine: string): void {
    this.doctrine = doctrine;
  }

  /**
   * Increment event count
   */
  incrementEvent(): void {
    this.eventCount++;
  }

  /**
   * Mark event as cleared
   */
  clearEvent(isCombat: boolean): void {
    this.eventsCleared++;
    if (isCombat) {
      this.combatsWon++;
    }
  }

  /**
   * Check if party is alive
   */
  isPartyAlive(): boolean {
    return this.agents.some(a => a.isAlive());
  }

  /**
   * Get alive agents
   */
  getAliveAgents(): Agent[] {
    return this.agents.filter(a => a.isAlive());
  }

  /**
   * Get stats summary
   */
  getStatsSummary(): string {
    return `Events Cleared: ${this.eventsCleared} | Combats Won: ${this.combatsWon} | Alive: ${this.getAliveAgents().length}/${this.agents.length}`;
  }
}
