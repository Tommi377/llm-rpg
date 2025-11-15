/**
 * Client for interacting with Ollama local LLM
 * Handles all API calls, retries, and error handling
 */

export interface OllamaOptions {
  model?: string;
  temperature?: number;
  maxRetries?: number;
  timeout?: number;
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

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxRetries: number;
  private timeout: number;

  constructor(options: OllamaOptions = {}) {
    this.baseUrl = "http://localhost:11434";
    this.model = options.model || "llama3.2";
    this.temperature = options.temperature || 0.7;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 60000; // 60 seconds
  }

  /**
   * Generate a response from Ollama
   */
  async generate(prompt: string, format?: "json"): Promise<string> {
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

  /**
   * Generate a JSON response with automatic parsing
   */
  async generateJSON<T>(prompt: string): Promise<T> {
    const response = await this.generate(prompt, "json");

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      console.error("Failed to parse JSON response:", response);
      throw new Error("Invalid JSON response from Ollama");
    }
  }

  /**
   * Check if Ollama is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
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

// Singleton instance
export const ollama = new OllamaClient();
