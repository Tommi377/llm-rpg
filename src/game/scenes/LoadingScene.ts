import { ENEMY_TEMPLATES } from "@/combat/Enemy";
import Phaser from "phaser";

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoadingScene" });
  }

  preload(): void {
    const { width, height } = this.scale;

    // Simple loading text
    const loadingText = this.add
      .text(width / 2, height / 2, "Loading...", {
        fontFamily: "Courier New",
        fontSize: "24px",
        color: "#00ff00",
      })
      .setOrigin(0.5);

    console.group("%c[LOADING ASSETS]", "color: cyan; font-weight: bold;");

    //
    // ===== DEFAULTS =====
    //
    console.log("→ Loading default graphics...");
    this.load.image("default", "assets/defaults/default.png");
    this.load.image("default-agent", "assets/defaults/default-agent.png");

    //
    // ===== AGENT SPRITES =====
    //
    const agentKeys = ["knight", "mage", "ranger", "healer", "rogue"];
    console.log(`→ Loading agent sprites:`, agentKeys);
    agentKeys.forEach((key) => {
      this.load.image(key, `assets/agents/${key}.png`);
    });

    //
    // ===== ENEMY SPRITES =====
    //
    const loadedKeys = new Set<string>();
    const enemySpriteList: string[] = [];

    for (const key of Object.keys(ENEMY_TEMPLATES)) {
      const spriteKey = ENEMY_TEMPLATES[key].spriteKey;
      if (!spriteKey) continue;
      if (loadedKeys.has(spriteKey)) continue;

      loadedKeys.add(spriteKey);
      enemySpriteList.push(spriteKey);
      this.load.image(spriteKey, `assets/enemies/${spriteKey}.png`);
    }

    console.log(`→ Dynamic enemy sprites:`, enemySpriteList);

    //
    // ===== DEBUG: HOOK LOAD EVENTS =====
    //
    this.load.on("filecomplete", (key: string) => {
      console.log(`✔ Loaded: ${key}`);
    });

    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`✖ Failed to load: ${file.key}`, file.src);
    });

    this.load.on("progress", (value: number) => {
      loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });

    this.load.on("complete", () => {
      loadingText.setText("Ready!");
      console.groupEnd();
      console.log("%cAll assets loaded.", "color: lime; font-weight: bold;");

      // Debug summary check
      this.debugTextureCheck();
    });
  }

  /**
   * Debug helper to verify all assets exist in the Texture Manager
   */
  debugTextureCheck(): void {
    console.group(
      "%c[TEXTURE VALIDATION]",
      "color: yellow; font-weight: bold;",
    );
    const missing: string[] = [];

    const check = (key: string) => {
      if (!this.textures.exists(key)) {
        missing.push(key);
      } else {
        console.log(`✔ Texture OK: ${key}`);
      }
    };

    // Check defaults
    check("default");
    check("default-agent");

    // Check agents
    ["knight", "mage", "ranger", "healer", "rogue"].forEach(check);

    // Check enemies
    Object.values(ENEMY_TEMPLATES)
      .map((t) => t.spriteKey)
      .filter((key): key is string => typeof key === "string")
      .forEach(check);

    console.groupEnd();
  }

  create(): void {
    this.scene.start("MainMenuScene");
  }
}
