/**
 * Helper class for building structured prompts with context
 */

import type { Agent } from '../agents/Agent';

export class PromptBuilder {
  /**
   * Build a prompt for generating agent personality
   */
  static agentGeneration(name: string): string {
    return `Generate a personality profile for an RPG character named "${name}".

Return a JSON object with the following structure:
{
  "personality": "A brief description of their personality (1-2 sentences)",
  "flaw": "A single character flaw that affects decision-making",
  "signatureSkill": "A special ability or skill they excel at"
}

Make the character interesting and unique. The flaw should be meaningful but not crippling.`;
  }

  /**
   * Build a prompt for agent decision-making during events
   */
  static eventDecision(
    agent: Agent,
    eventDescription: string,
    doctrine: string,
    recentHistory: string[]
  ): string {
    const historyText = recentHistory.length > 0
      ? `Recent history:\n${recentHistory.join('\n')}\n\n`
      : '';

    const traumaText = agent.trauma.length > 0
      ? `Traumas: ${agent.trauma.join(', ')}\n`
      : '';

    return `You are ${agent.name}, an adventurer with the following profile:

Personality: ${agent.personality}
Flaw: ${agent.flaw}
Signature Skill: ${agent.signatureSkill}
${traumaText}
Current Stats:
- HP: ${agent.hp}/${agent.maxHp}
- ATT: ${agent.attack}
- MIND: ${agent.mind}

${historyText}Player's guidance: "${doctrine}"

Situation: ${eventDescription}

How do you respond? Think about your personality, flaw, and current condition.

Respond with JSON in this format:
{
  "action": "A brief description of what you do",
  "reasoning": "Your in-character thought process (1-2 sentences)"
}`;
  }

  /**
   * Build a prompt for combat action selection
   */
  static combatAction(
    agent: Agent,
    enemies: Array<{ name: string; hp: number; maxHp: number }>,
    allies: Array<{ name: string; hp: number; maxHp: number }>,
    doctrine: string
  ): string {
    const enemyList = enemies.map((e, i) =>
      `Enemy ${i + 1}: ${e.name} (HP: ${e.hp}/${e.maxHp})`
    ).join('\n');

    const allyList = allies
      .filter(a => a.name !== agent.name)
      .map(a => `${a.name} (HP: ${a.hp}/${a.maxHp})`)
      .join('\n');

    const traumaText = agent.trauma.length > 0
      ? `Traumas: ${agent.trauma.join(', ')}\n`
      : '';

    return `You are ${agent.name} in combat.

Your profile:
Personality: ${agent.personality}
Flaw: ${agent.flaw}
${traumaText}
Your Stats:
- HP: ${agent.hp}/${agent.maxHp}
- ATT: ${agent.attack}
- MIND: ${agent.mind}

Allies:
${allyList || 'None'}

Enemies:
${enemyList}

Player's guidance: "${doctrine}"

Available actions:
1. attack - Deal damage to an enemy (damage based on ATT)
2. defend - Reduce incoming damage for 1 turn
3. heal - Restore HP to yourself or an ally (amount based on MIND)
4. special - Use your signature skill: ${agent.signatureSkill}

Choose your action wisely based on your personality, the situation, and player guidance.

Respond with JSON:
{
  "action": "attack|defend|heal|special",
  "target": 0-indexed number (0 = first enemy, etc.) or "self" for heal,
  "reasoning": "Your in-character thought process"
}`;
  }

  /**
   * Build a prompt for event generation
   */
  static eventGeneration(
    party: Agent[],
    eventType: 'normal' | 'combat',
    template: string,
    previousEvents: string[]
  ): string {
    const partyDescription = party.map(a =>
      `${a.name} (${a.personality.slice(0, 50)}...)`
    ).join(', ');

    const recentEvents = previousEvents.length > 0
      ? `\nRecent events:\n${previousEvents.slice(-3).join('\n')}`
      : '';

    if (eventType === 'combat') {
      return `Generate a combat encounter for this adventuring party: ${partyDescription}

${recentEvents}

Use this template as inspiration: ${template}

Create an engaging combat scenario. Describe the enemies and the situation.

Respond with JSON:
{
  "description": "Vivid description of the combat encounter (2-3 sentences)",
  "enemies": [
    {"name": "Enemy name", "type": "enemy type", "count": 1-3}
  ]
}`;
    } else {
      return `Generate a narrative event for this adventuring party: ${partyDescription}

${recentEvents}

Use this template as inspiration: ${template}

Create a challenging scenario that requires decision-making. The party must respond to this situation.

Respond with JSON:
{
  "description": "Engaging description of the situation (2-3 sentences)",
  "challenge": "What makes this difficult or interesting"
}`;
    }
  }

  /**
   * Build a prompt for judging event outcomes
   */
  static judgeEvent(
    eventDescription: string,
    agentActions: Array<{ name: string; action: string; reasoning: string }>,
    doctrine: string
  ): string {
    const actionsText = agentActions.map(a =>
      `${a.name}: ${a.action}\n  Reasoning: ${a.reasoning}`
    ).join('\n\n');

    return `Judge how well this adventuring party handled a situation.

Situation: ${eventDescription}

Player's doctrine: "${doctrine}"

Agent actions:
${actionsText}

Evaluate each agent's response based on:
1. Alignment with player doctrine
2. Practicality and effectiveness
3. Creativity and problem-solving
4. Risk management

For each agent, assign an outcome: "good", "neutral", or "bad"
Good outcomes grant stat bonuses (+1 to ATT or MIND)
Bad outcomes may cause HP loss or trauma

Respond with JSON:
{
  "summary": "Brief narrative of what happened (2-3 sentences)",
  "results": [
    {
      "name": "Agent name",
      "outcome": "good|neutral|bad",
      "statChange": {"hp": 0, "attack": 0, "mind": 0},
      "trauma": "optional trauma description if outcome is bad",
      "feedback": "Brief feedback on their action"
    }
  ]
}`;
  }

  /**
   * Build a prompt for judging combat outcomes
   */
  static judgeCombat(
    agentName: string,
    action: string,
    reasoning: string,
    targetInfo: string
  ): string {
    return `An adventurer named ${agentName} is performing a combat action.

Action: ${action}
Target: ${targetInfo}
Their reasoning: "${reasoning}"

Judge the effectiveness and creativity of this action.

Respond with JSON:
{
  "success": true or false,
  "damage": number (if attack, based on effectiveness),
  "narrative": "Brief description of what happens (1 sentence)",
  "bonus": "Optional bonus effect based on creativity"
}`;
  }
}
