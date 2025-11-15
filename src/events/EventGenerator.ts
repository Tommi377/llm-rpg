/**
 * Generates events using LLM and templates
 */

import { Agent } from '../agents/Agent';
import { ollama } from '../llm/OllamaClient';
import { PromptBuilder } from '../llm/PromptBuilder';
import { EventTemplateSelector } from './EventTemplates';

export interface GeneratedEvent {
  type: 'normal' | 'combat';
  description: string;
  challenge?: string;
  enemies?: Array<{ name: string; type: string; count: number }>;
}

export class EventGenerator {
  private templateSelector: EventTemplateSelector;
  private eventHistory: string[];

  constructor() {
    this.templateSelector = new EventTemplateSelector();
    this.eventHistory = [];
  }

  /**
   * Generate a new event
   */
  async generateEvent(
    party: Agent[],
    eventCount: number,
    forceCombat: boolean = false
  ): Promise<GeneratedEvent> {
    // Determine event type (60% combat, 40% normal, unless forced)
    const eventType = forceCombat || Math.random() < 0.6 ? 'combat' : 'normal';

    // Get difficulty based on progression
    const difficulty = EventTemplateSelector.getWeightedDifficulty(eventCount);

    // Select template
    const template = this.templateSelector.getRandomTemplate(eventType, difficulty);

    try {
      // Generate event using LLM
      const prompt = PromptBuilder.eventGeneration(
        party,
        eventType,
        template.template,
        this.eventHistory
      );

      if (eventType === 'combat') {
        const response = await ollama.generateJSON<{
          description: string;
          enemies: Array<{ name: string; type: string; count: number }>;
        }>(prompt);

        // Validate enemies
        if (!response.enemies || response.enemies.length === 0) {
          response.enemies = [{ name: 'Bandit', type: 'human', count: 2 }];
        }

        const event: GeneratedEvent = {
          type: 'combat',
          description: response.description,
          enemies: response.enemies,
        };

        this.eventHistory.push(`Combat: ${response.description}`);
        return event;
      } else {
        const response = await ollama.generateJSON<{
          description: string;
          challenge: string;
        }>(prompt);

        const event: GeneratedEvent = {
          type: 'normal',
          description: response.description,
          challenge: response.challenge,
        };

        this.eventHistory.push(`Event: ${response.description}`);
        return event;
      }
    } catch (error) {
      console.error('Failed to generate event:', error);

      // Fallback events
      if (eventType === 'combat') {
        return {
          type: 'combat',
          description: template.template,
          enemies: [{ name: 'Bandit', type: 'human', count: 2 }],
        };
      } else {
        return {
          type: 'normal',
          description: template.template,
          challenge: 'You must decide how to proceed carefully.',
        };
      }
    }
  }

  /**
   * Get event history
   */
  getHistory(): string[] {
    return [...this.eventHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.templateSelector.reset();
  }
}
