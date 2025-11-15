/**
 * Judges event outcomes and assigns rewards/penalties
 */

import { Agent } from '../agents/Agent';
import { ollama } from '../llm/OllamaClient';
import { PromptBuilder } from '../llm/PromptBuilder';

export interface AgentResult {
  name: string;
  outcome: 'good' | 'neutral' | 'bad';
  statChange: { hp: number; attack: number; mind: number };
  trauma?: string;
  feedback: string;
}

export interface JudgementResult {
  summary: string;
  results: AgentResult[];
}

export class EventJudge {
  /**
   * Judge event outcomes for all agents
   */
  static async judgeEvent(
    eventDescription: string,
    agentActions: Array<{ name: string; action: string; reasoning: string }>,
    doctrine: string
  ): Promise<JudgementResult> {
    try {
      const prompt = PromptBuilder.judgeEvent(eventDescription, agentActions, doctrine);

      const response = await ollama.generateJSON<JudgementResult>(prompt);

      // Validate results
      if (!response.results || response.results.length === 0) {
        throw new Error('Invalid judgement response');
      }

      return response;
    } catch (error) {
      console.error('Failed to judge event:', error);

      // Fallback judgement: neutral outcome for all
      return {
        summary: 'The party handled the situation adequately.',
        results: agentActions.map(action => ({
          name: action.name,
          outcome: 'neutral',
          statChange: { hp: 0, attack: 0, mind: 0 },
          feedback: 'Your action was reasonable.',
        })),
      };
    }
  }

  /**
   * Apply judgement results to agents
   */
  static applyResults(agents: Agent[], results: AgentResult[]): void {
    for (const result of results) {
      const agent = agents.find(a => a.name === result.name);
      if (!agent) continue;

      // Apply stat changes
      agent.modifyStats(result.statChange);

      // Add trauma if any
      if (result.trauma) {
        agent.addTrauma(result.trauma);
      }
    }
  }

  /**
   * Judge a combat action
   */
  static async judgeCombatAction(
    agentName: string,
    action: string,
    reasoning: string,
    targetInfo: string
  ): Promise<{
    success: boolean;
    damage: number;
    narrative: string;
    bonus?: string;
  }> {
    try {
      const prompt = PromptBuilder.judgeCombat(agentName, action, reasoning, targetInfo);

      const response = await ollama.generateJSON<{
        success: boolean;
        damage: number;
        narrative: string;
        bonus?: string;
      }>(prompt);

      return response;
    } catch (error) {
      console.error('Failed to judge combat action:', error);

      // Fallback: 50% success chance, moderate damage
      const success = Math.random() > 0.3;
      return {
        success,
        damage: success ? 10 + Math.floor(Math.random() * 10) : 0,
        narrative: success
          ? `${agentName}'s ${action} connects!`
          : `${agentName}'s ${action} misses!`,
      };
    }
  }

  /**
   * Generate a summary of the event
   */
  static generateSummary(results: AgentResult[]): string {
    const goodOutcomes = results.filter(r => r.outcome === 'good').length;
    const badOutcomes = results.filter(r => r.outcome === 'bad').length;

    if (goodOutcomes > badOutcomes) {
      return `The party handled the situation well. ${goodOutcomes} members performed admirably.`;
    } else if (badOutcomes > goodOutcomes) {
      return `The party struggled with this challenge. ${badOutcomes} members made poor choices.`;
    } else {
      return 'The party dealt with the situation adequately, though not without difficulty.';
    }
  }
}
