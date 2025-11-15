/**
 * Represents an enemy in combat
 */

export interface EnemyTemplate {
  name: string;
  type: string;
  baseHp: number;
  baseAttack: number;
  color: number;
  abilities?: string[];
}

export class Enemy {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  attack: number;
  color: number;
  abilities: string[];
  isDefending: boolean;

  constructor(template: EnemyTemplate) {
    this.name = template.name;
    this.type = template.type;
    this.maxHp = template.baseHp;
    this.hp = template.baseHp;
    this.attack = template.baseAttack;
    this.color = template.color;
    this.abilities = template.abilities || [];
    this.isDefending = false;
  }

  /**
   * Check if enemy is alive
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
   * Perform a simple AI action
   */
  chooseAction(targets: Array<{ name: string; hp: number }>): {
    action: 'attack' | 'defend';
    target: number;
  } {
    // Simple AI: attack the weakest target, or defend if low on HP
    if (this.hp < this.maxHp * 0.3) {
      return { action: 'defend', target: 0 };
    }

    // Find weakest target
    let weakestIndex = 0;
    let lowestHp = targets[0].hp;

    for (let i = 1; i < targets.length; i++) {
      if (targets[i].hp < lowestHp) {
        lowestHp = targets[i].hp;
        weakestIndex = i;
      }
    }

    return { action: 'attack', target: weakestIndex };
  }

  /**
   * Set defending status
   */
  defend(): void {
    this.isDefending = true;
  }

  /**
   * Get display info
   */
  getInfo(): { name: string; hp: number; maxHp: number } {
    return {
      name: this.name,
      hp: this.hp,
      maxHp: this.maxHp,
    };
  }
}

// Enemy templates
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  bandit: {
    name: 'Bandit',
    type: 'human',
    baseHp: 40,
    baseAttack: 8,
    color: 0xff6666,
  },
  wolf: {
    name: 'Dire Wolf',
    type: 'beast',
    baseHp: 50,
    baseAttack: 10,
    color: 0x888888,
    abilities: ['Pack tactics'],
  },
  zombie: {
    name: 'Zombie',
    type: 'undead',
    baseHp: 60,
    baseAttack: 7,
    color: 0x66ff66,
  },
  cultist: {
    name: 'Cultist',
    type: 'human',
    baseHp: 35,
    baseAttack: 12,
    color: 0x9966ff,
    abilities: ['Dark magic'],
  },
  ogre: {
    name: 'Ogre',
    type: 'giant',
    baseHp: 120,
    baseAttack: 15,
    color: 0xcc9966,
  },
  spider: {
    name: 'Giant Spider',
    type: 'beast',
    baseHp: 45,
    baseAttack: 9,
    color: 0x333333,
    abilities: ['Poison bite'],
  },
  elemental: {
    name: 'Fire Elemental',
    type: 'elemental',
    baseHp: 55,
    baseAttack: 13,
    color: 0xff9933,
    abilities: ['Flame aura'],
  },
  guard: {
    name: 'Guard',
    type: 'human',
    baseHp: 50,
    baseAttack: 10,
    color: 0x6666ff,
  },
  goblin: {
    name: 'Goblin',
    type: 'goblinoid',
    baseHp: 30,
    baseAttack: 6,
    color: 0x66cc66,
  },
  demon: {
    name: 'Lesser Demon',
    type: 'fiend',
    baseHp: 80,
    baseAttack: 16,
    color: 0xcc0000,
    abilities: ['Dark pact', 'Fear aura'],
  },
};

export class EnemyFactory {
  /**
   * Create enemies from event data
   */
  static createEnemies(
    enemyData: Array<{ name: string; type: string; count: number }>
  ): Enemy[] {
    const enemies: Enemy[] = [];

    for (const data of enemyData) {
      // Try to find a matching template
      const templateKey = Object.keys(ENEMY_TEMPLATES).find(
        key => ENEMY_TEMPLATES[key].name.toLowerCase().includes(data.name.toLowerCase()) ||
               ENEMY_TEMPLATES[key].type.toLowerCase() === data.type.toLowerCase()
      );

      const template = templateKey
        ? ENEMY_TEMPLATES[templateKey]
        : {
            name: data.name,
            type: data.type,
            baseHp: 40,
            baseAttack: 8,
            color: 0xff6666,
          };

      // Create the specified number of enemies
      for (let i = 0; i < data.count; i++) {
        const enemy = new Enemy(template);
        // Add number suffix if multiple of same type
        if (data.count > 1) {
          enemy.name = `${enemy.name} ${i + 1}`;
        }
        enemies.push(enemy);
      }
    }

    return enemies;
  }

  /**
   * Create a single enemy by type
   */
  static createEnemy(type: string): Enemy {
    const template = ENEMY_TEMPLATES[type] || ENEMY_TEMPLATES.bandit;
    return new Enemy(template);
  }
}
