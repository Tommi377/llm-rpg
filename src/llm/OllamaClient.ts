/**
 * Client for interacting with LLM providers (Ollama or Groq)
 * Handles all API calls, retries, and error handling
 */

export type LLMProvider = "ollama" | "groq";

export interface OllamaOptions {
  model?: string;
  temperature?: number;
  maxRetries?: number;
  timeout?: number;
  provider?: LLMProvider;
  apiKey?: string;
}

export interface OllamaResponse {
  response: string;
  model: string;
  done: boolean;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  format?: "json";
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  response_format?: { type: "json_object" };
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxRetries: number;
  private timeout: number;
  private provider: LLMProvider;
  private apiKey: string | null;

  constructor(options: OllamaOptions = {}) {
    this.provider = options.provider || "ollama";
    this.apiKey = options.apiKey || this.loadStoredApiKey();

    if (this.provider === "ollama") {
      this.baseUrl = "http://localhost:11434";
      this.model = options.model || "llama3.2";
    } else {
      this.baseUrl = "https://api.groq.com/openai/v1";
      this.model = options.model || "openai/gpt-oss-120b";
    }

    this.temperature = options.temperature || 0.7;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 60000; // 60 seconds
  }

  private loadStoredApiKey(): string | null {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem("llm_api_key");
    }
    return null;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("llm_api_key", apiKey);
    }
  }

  public setProvider(provider: LLMProvider, apiKey?: string): void {
    this.provider = provider;
    if (apiKey) {
      this.setApiKey(apiKey);
    }

    if (provider === "ollama") {
      this.baseUrl = "http://localhost:11434";
      this.model = "llama3.2";
    } else {
      this.baseUrl = "https://api.groq.com/openai/v1";
      this.model = "llama-3.2-90b-text-preview";
    }
  }

  /**
   * Generate a response from LLM provider
   */
  async generate(prompt: string, format?: "json"): Promise<string> {
    if (this.provider === "ollama") {
      return this.generateOllama(prompt, format);
    } else {
      return this.generateGroq(prompt, format);
    }
  }

  private async generateOllama(
    prompt: string,
    format?: "json",
  ): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: this.temperature,
      },
    };

    if (format === "json") {
      request.format = "json";
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Ollama API error: ${response.status} ${response.statusText}`,
          );
        }

        const data: OllamaResponse = await response.json();
        return data.response;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Ollama request failed (attempt ${attempt + 1}/${this.maxRetries}):`,
          error,
        );

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, attempt)),
          );
        }
      }
    }

    throw new Error(
      `Ollama request failed after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  private async generateGroq(prompt: string, format?: "json"): Promise<string> {
    if (!this.apiKey) {
      throw new Error("API key required for Groq provider");
    }

    const request: GroqRequest = {
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: this.temperature,
    };

    if (format === "json") {
      request.response_format = { type: "json_object" };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Groq API error: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Groq request failed (attempt ${attempt + 1}/${this.maxRetries}):`,
          error,
        );

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, attempt)),
          );
        }
      }
    }

    throw new Error(
      `Groq request failed after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Generate a JSON response with automatic parsing
   */
  async generateJSON<T>(prompt: string): Promise<T> {
    const response = await this.generate(prompt, "json");

    console.log("PROMPT", prompt, "\n\nRESPONSE\n\n", response);
    try {
      return JSON.parse(response) as T;
    } catch (error) {
      console.error("Failed to parse JSON response:", response);
      throw new Error("Invalid JSON response from Ollama");
    }
  }

  /**
   * Check if LLM provider is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (this.provider === "ollama") {
        const response = await fetch(`${this.baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } else {
        // For Groq, check if we have an API key
        if (!this.apiKey) {
          return false;
        }
        // Try a simple API call to verify the key works
        const response = await fetch(`${this.baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get current provider
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Get stored provider from localStorage
   */
  getStoredProvider(): LLMProvider {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("llm_provider");
      if (stored === "groq" || stored === "ollama") {
        return stored;
      }
    }
    return "ollama";
  }

  /**
   * Store provider preference
   */
  storeProvider(provider: LLMProvider): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("llm_provider", provider);
    }
  }

  /**
   * Get stored API key
   */
  getStoredApiKey(): string | null {
    return this.loadStoredApiKey();
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      if (this.provider === "ollama") {
        const response = await fetch(`${this.baseUrl}/api/tags`);
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
      } else {
        // For Groq, return available models
        return [
          "llama-3.2-90b-text-preview",
          "llama-3.2-11b-text-preview",
          "llama-3.2-3b-preview",
          "llama-3.2-1b-preview",
        ];
      }
    } catch (error) {
      console.error("Failed to list models:", error);
      return [];
    }
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Set the temperature
   */
  setTemperature(temperature: number): void {
    this.temperature = Math.max(0, Math.min(2, temperature));
  }
}

// Singleton instance - load saved settings from localStorage
const getInitialProvider = (): LLMProvider => {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = localStorage.getItem("llm_provider");
    if (stored === "groq" || stored === "ollama") {
      return stored;
    }
  }
  return "ollama";
};

const getInitialApiKey = (): string | undefined => {
  if (typeof window !== "undefined" && window.localStorage) {
    const key = localStorage.getItem("llm_api_key");
    return key || undefined;
  }
  return undefined;
};

export const ollama = new OllamaClient({
  provider: getInitialProvider(),
  apiKey: getInitialApiKey(),
});
