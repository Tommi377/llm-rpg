/**
 * Templates for event generation
 * LLM uses these as inspiration to create unique events
 */

export interface EventTemplate {
  id: string;
  type: 'normal' | 'combat';
  template: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  // Normal Events
  {
    id: 'bridge',
    type: 'normal',
    template: 'A bridge ahead is damaged and unstable. There may be danger approaching from behind.',
    difficulty: 'medium',
  },
  {
    id: 'stranger',
    type: 'normal',
    template: 'A mysterious stranger offers valuable information in exchange for something precious.',
    difficulty: 'easy',
  },
  {
    id: 'treasure',
    type: 'normal',
    template: 'You discover a chest that appears trapped. It may contain valuable loot or danger.',
    difficulty: 'medium',
  },
  {
    id: 'fork',
    type: 'normal',
    template: 'The path splits into three directions: one safe but long, one risky but quick, one mysterious.',
    difficulty: 'easy',
  },
  {
    id: 'injured',
    type: 'normal',
    template: 'You encounter an injured traveler who claims to have been attacked by bandits nearby.',
    difficulty: 'medium',
  },
  {
    id: 'ruins',
    type: 'normal',
    template: 'Ancient ruins block your path. They may contain shortcuts or secrets, but could be unstable.',
    difficulty: 'hard',
  },
  {
    id: 'merchant',
    type: 'normal',
    template: 'A traveling merchant offers rare items at suspicious prices. Something feels off.',
    difficulty: 'easy',
  },
  {
    id: 'shrine',
    type: 'normal',
    template: 'A magical shrine radiates power. It may grant blessings or curses to those who approach.',
    difficulty: 'medium',
  },
  {
    id: 'storm',
    type: 'normal',
    template: 'A sudden storm forces you to find shelter quickly. Multiple options present themselves.',
    difficulty: 'medium',
  },
  {
    id: 'river',
    type: 'normal',
    template: 'A raging river blocks your path. You must decide how to cross with limited resources.',
    difficulty: 'hard',
  },
  {
    id: 'village',
    type: 'normal',
    template: 'You arrive at a village with a dark secret. The villagers act strangely welcoming.',
    difficulty: 'hard',
  },
  {
    id: 'beast',
    type: 'normal',
    template: 'A rare magical beast appears. It seems intelligent but potentially dangerous.',
    difficulty: 'medium',
  },

  // Combat Events
  {
    id: 'bandits',
    type: 'combat',
    template: 'A group of bandits ambushes you on the road, demanding valuables.',
    difficulty: 'easy',
  },
  {
    id: 'wolves',
    type: 'combat',
    template: 'A pack of dire wolves emerges from the forest, hungry and aggressive.',
    difficulty: 'medium',
  },
  {
    id: 'undead',
    type: 'combat',
    template: 'Undead creatures rise from the ground, drawn by necromantic energy.',
    difficulty: 'medium',
  },
  {
    id: 'cultists',
    type: 'combat',
    template: 'Fanatical cultists block your path, chanting about an ancient prophecy.',
    difficulty: 'hard',
  },
  {
    id: 'ogre',
    type: 'combat',
    template: 'A massive ogre demands tribute for passing through its territory.',
    difficulty: 'hard',
  },
  {
    id: 'spiders',
    type: 'combat',
    template: 'Giant spiders descend from the trees, their webs glistening with venom.',
    difficulty: 'medium',
  },
  {
    id: 'elementals',
    type: 'combat',
    template: 'Elemental creatures manifest, drawn to the magic in your party.',
    difficulty: 'hard',
  },
  {
    id: 'guards',
    type: 'combat',
    template: 'Corrupt guards attempt to arrest you on false charges.',
    difficulty: 'easy',
  },
  {
    id: 'goblins',
    type: 'combat',
    template: 'A war band of goblins spots you from their camp and charges to attack.',
    difficulty: 'easy',
  },
  {
    id: 'demon',
    type: 'combat',
    template: 'A minor demon materializes, seeking souls to claim for its master.',
    difficulty: 'hard',
  },
];

export class EventTemplateSelector {
  private usedTemplates: Set<string> = new Set();

  /**
   * Get a random template of a specific type
   */
  getRandomTemplate(type: 'normal' | 'combat', difficulty?: 'easy' | 'medium' | 'hard'): EventTemplate {
    let candidates = EVENT_TEMPLATES.filter(t => t.type === type);

    if (difficulty) {
      candidates = candidates.filter(t => t.difficulty === difficulty);
    }

    // Filter out recently used templates
    const unused = candidates.filter(t => !this.usedTemplates.has(t.id));

    // If all templates have been used, reset
    if (unused.length === 0) {
      this.usedTemplates.clear();
      return this.getRandomTemplate(type, difficulty);
    }

    // Pick a random template
    const template = unused[Math.floor(Math.random() * unused.length)];
    this.usedTemplates.add(template.id);

    return template;
  }

  /**
   * Get a weighted random difficulty
   */
  static getWeightedDifficulty(eventCount: number): 'easy' | 'medium' | 'hard' {
    // Difficulty increases as game progresses
    const rand = Math.random();

    if (eventCount < 3) {
      // Early game: mostly easy
      return rand < 0.7 ? 'easy' : 'medium';
    } else if (eventCount < 6) {
      // Mid game: mixed
      if (rand < 0.3) return 'easy';
      if (rand < 0.8) return 'medium';
      return 'hard';
    } else {
      // Late game: harder
      if (rand < 0.2) return 'medium';
      return 'hard';
    }
  }

  /**
   * Reset the used templates tracker
   */
  reset(): void {
    this.usedTemplates.clear();
  }
}
