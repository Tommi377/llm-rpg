/**
 * Turn-based combat system
 */

import { Agent } from '../agents/Agent';
import { Enemy } from './Enemy';
import { AgentAI, CombatAction } from '../agents/AgentAI';
import { EventJudge } from '../events/EventJudge';

export interface CombatTurnResult {
  actor: string;
  action: string;
  target: string;
  damage: number;
  narrative: string;
  actorType: 'agent' | 'enemy';
}

export interface CombatResult {
  victory: boolean;
  turns: CombatTurnResult[];
  survivingAgents: Agent[];
}

export class CombatSystem {
  private agents: Agent[];
  private enemies: Enemy[];
  private turnLog: CombatTurnResult[];
  private doctrine: string;

  constructor(agents: Agent[], enemies: Enemy[], doctrine: string) {
    this.agents = agents;
    this.enemies = enemies;
    this.turnLog = [];
    this.doctrine = doctrine;
  }

  /**
   * Run the entire combat encounter
   */
  async runCombat(): Promise<CombatResult> {
    this.turnLog = [];

    // Combat continues until one side is defeated
    while (this.hasAliveAgents() && this.hasAliveEnemies()) {
      await this.executeTurn();
    }

    return {
      victory: this.hasAliveAgents(),
      turns: this.turnLog,
      survivingAgents: this.agents.filter(a => a.isAlive()),
    };
  }

  /**
   * Execute a single turn
   */
  private async executeTurn(): Promise<void> {
    // Reset defense status at start of turn
    this.agents.forEach(a => a.resetDefense());
    this.enemies.forEach(e => e.isDefending = false);

    // Agents act first
    await this.agentPhase();

    // Check if enemies are defeated
    if (!this.hasAliveEnemies()) return;

    // Enemies act
    this.enemyPhase();
  }

  /**
   * Agent turn phase
   */
  private async agentPhase(): Promise<void> {
    const aliveAgents = this.agents.filter(a => a.isAlive());

    // Get all agent actions in parallel
    const enemyInfo = this.enemies
      .filter(e => e.isAlive())
      .map(e => e.getInfo());

    const actions = await AgentAI.batchCombatActions(
      aliveAgents,
      enemyInfo,
      this.doctrine
    );

    // Execute each agent's action
    for (const agent of aliveAgents) {
      const action = actions.get(agent.name);
      if (!action) continue;

      await this.executeAgentAction(agent, action);

      // Break if all enemies defeated
      if (!this.hasAliveEnemies()) break;
    }
  }

  /**
   * Execute a single agent action
   */
  private async executeAgentAction(agent: Agent, action: CombatAction): Promise<void> {
    const result: CombatTurnResult = {
      actor: agent.name,
      action: action.action,
      target: '',
      damage: 0,
      narrative: '',
      actorType: 'agent',
    };

    switch (action.action) {
      case 'attack': {
        const target = this.getAliveEnemy(action.target as number);
        if (!target) break;

        result.target = target.name;

        // LLM judges the attack
        const judgement = await EventJudge.judgeCombatAction(
          agent.name,
          'attack',
          action.reasoning,
          target.name
        );

        if (judgement.success) {
          const baseDamage = agent.attack + Math.floor(Math.random() * 5);
          const totalDamage = baseDamage + (judgement.damage || 0);
          const actualDamage = target.takeDamage(totalDamage);

          result.damage = actualDamage;
          result.narrative = judgement.narrative + (judgement.bonus ? ` ${judgement.bonus}` : '');
        } else {
          result.narrative = judgement.narrative;
        }
        break;
      }

      case 'defend': {
        agent.defend();
        result.target = 'self';
        result.narrative = `${agent.name} takes a defensive stance!`;
        break;
      }

      case 'heal': {
        const target = action.target === 'self'
          ? agent
          : this.agents.filter(a => a.isAlive())[action.target as number];

        if (!target) break;

        const healAmount = agent.mind + Math.floor(Math.random() * 5);
        const actualHeal = target.heal(healAmount);

        result.target = target.name;
        result.damage = -actualHeal; // Negative damage = heal
        result.narrative = `${agent.name} heals ${target.name} for ${actualHeal} HP!`;
        break;
      }

      case 'special': {
        const target = this.getAliveEnemy(action.target as number);
        if (!target) break;

        result.target = target.name;

        // Special attack using signature skill
        const judgement = await EventJudge.judgeCombatAction(
          agent.name,
          `special: ${agent.signatureSkill}`,
          action.reasoning,
          target.name
        );

        if (judgement.success) {
          const baseDamage = agent.attack * 1.5 + Math.floor(Math.random() * 10);
          const totalDamage = baseDamage + (judgement.damage || 0);
          const actualDamage = target.takeDamage(totalDamage);

          result.damage = actualDamage;
          result.narrative = `${agent.name} uses ${agent.signatureSkill}! ${judgement.narrative}`;
        } else {
          result.narrative = `${agent.name}'s ${agent.signatureSkill} fails! ${judgement.narrative}`;
        }
        break;
      }
    }

    this.turnLog.push(result);
  }

  /**
   * Enemy turn phase
   */
  private enemyPhase(): void {
    const aliveEnemies = this.enemies.filter(e => e.isAlive());
    const aliveAgents = this.agents.filter(a => a.isAlive());

    if (aliveAgents.length === 0) return;

    const agentTargets = aliveAgents.map(a => ({ name: a.name, hp: a.hp }));

    for (const enemy of aliveEnemies) {
      const action = enemy.chooseAction(agentTargets);

      if (action.action === 'defend') {
        enemy.defend();
        this.turnLog.push({
          actor: enemy.name,
          action: 'defend',
          target: 'self',
          damage: 0,
          narrative: `${enemy.name} takes a defensive stance!`,
          actorType: 'enemy',
        });
      } else {
        const target = aliveAgents[action.target];
        if (!target) continue;

        const damage = enemy.attack + Math.floor(Math.random() * 5);
        const actualDamage = target.takeDamage(damage);

        this.turnLog.push({
          actor: enemy.name,
          action: 'attack',
          target: target.name,
          damage: actualDamage,
          narrative: `${enemy.name} attacks ${target.name} for ${actualDamage} damage!`,
          actorType: 'enemy',
        });
      }

      // Break if all agents defeated
      if (!this.hasAliveAgents()) break;
    }
  }

  /**
   * Get an alive enemy by index
   */
  private getAliveEnemy(index: number): Enemy | null {
    const aliveEnemies = this.enemies.filter(e => e.isAlive());
    return aliveEnemies[index] || aliveEnemies[0] || null;
  }

  /**
   * Check if any agents are alive
   */
  private hasAliveAgents(): boolean {
    return this.agents.some(a => a.isAlive());
  }

  /**
   * Check if any enemies are alive
   */
  private hasAliveEnemies(): boolean {
    return this.enemies.some(e => e.isAlive());
  }

  /**
   * Get current combat state
   */
  getCombatState(): {
    agents: Array<{ name: string; hp: number; maxHp: number }>;
    enemies: Array<{ name: string; hp: number; maxHp: number }>;
  } {
    return {
      agents: this.agents.map(a => ({
        name: a.name,
        hp: a.hp,
        maxHp: a.maxHp,
      })),
      enemies: this.enemies.map(e => e.getInfo()),
    };
  }
}
