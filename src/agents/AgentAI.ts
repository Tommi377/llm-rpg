/**
 * Handles LLM-powered decision making for agents
 */

import { Agent } from "./Agent";
import { ollama } from "../llm/OllamaClient";
import { PromptBuilder } from "../llm/PromptBuilder";

export interface EventDecision {
  action: string;
  reasoning: string;
}

export interface CombatAction {
  action: "attack" | "defend" | "heal" | "special";
  target: number | "self";
  reasoning: string;
}

export class AgentAI {
  /**
   * Generate a personality profile for a new agent
   */
  static async generatePersonality(name: string): Promise<{
    personality: string;
    flaw: string;
    signatureSkill: string;
  }> {
    try {
      const prompt = PromptBuilder.agentGeneration(name);
      const response = await ollama.generateJSON<{
        personality: string;
        flaw: string;
        signatureSkill: string;
      }>(prompt);

      return response;
    } catch (error) {
      console.error("Failed to generate personality:", error);

      // Fallback personality
      return {
        personality: `${name} is a cautious adventurer with a strong sense of duty.`,
        flaw: "Tends to overthink situations",
        signatureSkill: "Quick thinking in crisis",
      };
    }
  }

  /**
   * Make a decision during a normal event
   */
  static async decideEventAction(
    agent: Agent,
    eventDescription: string,
    doctrine: string,
    recentHistory: string[] = [],
  ): Promise<EventDecision> {
    try {
      const prompt = PromptBuilder.eventDecision(
        agent,
        eventDescription,
        doctrine,
        recentHistory,
      );

      const response = await ollama.generateJSON<EventDecision>(prompt);

      return response;
    } catch (error) {
      console.error(`Failed to get decision for ${agent.name}:`, error);

      // Fallback decision
      return {
        action: `${agent.name} carefully assesses the situation and proceeds with caution.`,
        reasoning: "Playing it safe due to uncertainty.",
      };
    }
  }

  /**
   * Choose a combat action
   */
  static async decideCombatAction(
    agent: Agent,
    enemies: Array<{ name: string; hp: number; maxHp: number }>,
    allies: Array<{ name: string; hp: number; maxHp: number }>,
    doctrine: string,
  ): Promise<CombatAction> {
    try {
      const prompt = PromptBuilder.combatAction(
        agent,
        enemies,
        allies,
        doctrine,
      );

      const response = await ollama.generateJSON<CombatAction>(prompt);

      // Validate the action
      if (!["attack", "defend", "heal", "special"].includes(response.action)) {
        throw new Error("Invalid action type");
      }

      return response;
    } catch (error) {
      console.error(`Failed to get combat action for ${agent.name}:`, error);

      // Fallback: attack the first enemy
      return {
        action: "attack",
        target: 0,
        reasoning: "Defaulting to a basic attack.",
      };
    }
  }

  /**
   * Batch process multiple agent decisions (for performance)
   */
  static async batchEventDecisions(
    agents: Agent[],
    eventDescription: string,
    doctrine: string,
    recentHistory: string[] = [],
  ): Promise<Map<string, EventDecision>> {
    const decisions = new Map<string, EventDecision>();

    // Process all agents in parallel
    const promises = agents
      .filter((a) => a.isAlive())
      .map(async (agent) => {
        const decision = await this.decideEventAction(
          agent,
          eventDescription,
          doctrine,
          recentHistory,
        );
        decisions.set(agent.name, decision);
      });

    await Promise.all(promises);

    return decisions;
  }

  /**
   * Batch process combat actions
   */
  static async batchCombatActions(
    agents: Agent[],
    enemies: Array<{ name: string; hp: number; maxHp: number }>,
    doctrine: string,
  ): Promise<Map<string, CombatAction>> {
    const actions = new Map<string, CombatAction>();

    // Get all alive agents
    const aliveAgents = agents.filter((a) => a.isAlive());

    // Process all agents in parallel
    const promises = aliveAgents.map(async (agent) => {
      const allies = aliveAgents.map((a) => ({
        name: a.name,
        hp: a.hp,
        maxHp: a.maxHp,
      }));

      const action = await this.decideCombatAction(
        agent,
        enemies,
        allies,
        doctrine,
      );
      actions.set(agent.name, action);
    });

    await Promise.all(promises);

    return actions;
  }
}
