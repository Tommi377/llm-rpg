# LLM Squad RPG

An autonomous AI-powered RPG where your squad of agents acts independently based on Large Language Model reasoning. You guide them with strategic doctrines, and they make their own decisions in events and combat.

## Features

- **Autonomous Agents**: Each party member has their own personality, flaw, and signature skill
- **LLM-Powered Decision Making**: Agents reason through situations using local LLM (Ollama)
- **Event System**: Procedurally generated events with consequences
- **Turn-Based Combat**: Agents autonomously decide their combat actions
- **Doctrine System**: Guide your agents with strategic instructions
- **Trauma & Growth**: Agents gain stats or trauma based on their performance

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Ollama** - Local LLM runtime
   - Install from: https://ollama.ai
   - Download and run a model: `ollama run llama3`
   - Keep Ollama running in the background while playing

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The game will open in your browser at `http://localhost:3000`

## How to Play

### 1. Party Setup
- Name your 3 agents
- The LLM will generate unique personalities, flaws, and skills for each agent
- Each agent has stats: HP (health), ATT (attack), and MIND (mental/magic power)

### 2. Game Loop
The game presents a series of events:

**Normal Events**:
- Narrative scenarios where agents must make decisions
- Enter your "doctrine" - strategic guidance for your agents
- Agents autonomously decide how to respond based on:
  - Their personality
  - Their stats and condition
  - Your doctrine
  - Recent history
- A judge LLM rates their performance and assigns rewards/penalties

**Combat Events**:
- Turn-based battles against enemies
- Enter your combat doctrine
- Agents autonomously choose actions: attack, defend, heal, or use their signature skill
- Combat continues until one side is defeated

### 3. Progression
- Good decisions grant stat increases
- Bad decisions may cause HP loss or trauma
- Trauma affects future decision-making
- Game continues until all agents are defeated

## Doctrine Examples

**Normal Events**:
- "Prioritize survival over glory"
- "Protect the healer at all costs"
- "Take calculated risks for greater rewards"
- "Be diplomatic and avoid unnecessary conflict"

**Combat**:
- "Focus fire on one enemy at a time"
- "Heal when anyone drops below 30% HP"
- "Use defensive tactics and wear them down"
- "Go all-out with aggressive attacks"

## Project Structure

```
src/
├── game/
│   ├── main.ts              # Phaser initialization
│   ├── GameState.ts         # Global game state
│   └── scenes/
│       ├── MainMenuScene.ts # Party setup
│       ├── GamePlayScene.ts # Event management
│       └── CombatScene.ts   # Turn-based combat
├── agents/
│   ├── Agent.ts             # Agent class with stats
│   └── AgentAI.ts           # LLM decision-making
├── events/
│   ├── EventGenerator.ts    # LLM-powered event creation
│   ├── EventJudge.ts        # Judges agent performance
│   └── EventTemplates.ts    # Event templates library
├── combat/
│   ├── CombatSystem.ts      # Turn-based combat logic
│   └── Enemy.ts             # Enemy classes
├── ui/
│   ├── ChatLog.ts           # Chat display
│   ├── ChatInput.ts         # Doctrine input
│   └── GameUI.ts            # HP bars and sprites
└── llm/
    ├── OllamaClient.ts      # Ollama API wrapper
    └── PromptBuilder.ts     # Prompt construction
```

## Technology Stack

- **TypeScript** - Type-safe development
- **Phaser 3** - Game framework for rendering and scenes
- **Vite** - Fast development server and build tool
- **Ollama** - Local LLM runtime (llama3 by default)

## Customization

### Change LLM Model
Edit `src/llm/OllamaClient.ts`:
```typescript
this.model = 'llama3'; // Change to 'mistral', 'codellama', etc.
```

### Add More Events
Edit `src/events/EventTemplates.ts` to add new event templates.

### Adjust Difficulty
- Modify agent starting stats in `Agent.ts`
- Adjust enemy HP/ATT in `Enemy.ts`
- Change event difficulty weighting in `EventTemplates.ts`

### Customize UI
- Modify colors and styles in `index.html`
- Adjust sprite sizes in `GameUI.ts`
- Change layouts in scene files

## Troubleshooting

**"Could not connect to Ollama"**:
- Make sure Ollama is installed and running
- Run `ollama run llama3` in a terminal
- Check that Ollama is accessible at `http://localhost:11434`

**LLM responses are slow**:
- Use a smaller/faster model: `ollama run llama3:8b`
- Adjust temperature in `OllamaClient.ts`

**Invalid JSON errors**:
- The LLM sometimes produces invalid JSON
- The game includes retry logic and fallbacks
- Consider using a more capable model

## Development

```bash
# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Future Enhancements

- Save/load game state
- More event types and variety
- Character progression system
- Equipment and inventory
- Multiple difficulty levels
- Sprite art and animations
- Sound effects and music
- Multiplayer party management

## License

MIT

## Credits

Built with Claude Code following the "ChatGPT game jam spec" design philosophy:
- LLM-powered autonomous agents
- Player guides via chat prompts
- Event-driven narrative gameplay
- Turn-based combat with AI decision-making
