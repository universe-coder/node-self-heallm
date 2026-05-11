import OpenAI from "openai";

import { requireEnv } from "../config/loadConfig.js";
import type { SelfHealConfig } from "../config/schema.js";

export class LLMClient {
  private readonly config: SelfHealConfig;

  public constructor(config: SelfHealConfig) {
    this.config = config;
  }

  public isConfigured(): boolean {
    return Boolean(process.env[this.config.llm.apiKeyEnv]);
  }

  public async chat(prompt: string): Promise<string> {
    if (this.config.llm.provider === "anthropic") {
      return this.chatAnthropic(prompt);
    }
    return this.chatOpenAICompatible(prompt);
  }

  public async embed(inputs: string[]): Promise<number[][]> {
    if (this.config.llm.provider === "anthropic") {
      throw new Error("Anthropic provider does not support embeddings for index command.");
    }
    const client = new OpenAI({
      apiKey: requireEnv(this.config.llm.apiKeyEnv),
      baseURL: this.config.llm.baseUrl
    });
    const response = await client.embeddings.create({
      model: this.config.llm.embeddingModel,
      input: inputs
    });
    return response.data.map((item) => item.embedding);
  }

  private async chatOpenAICompatible(prompt: string): Promise<string> {
    const client = new OpenAI({
      apiKey: requireEnv(this.config.llm.apiKeyEnv),
      baseURL: this.config.llm.baseUrl
    });
    const completion = await client.chat.completions.create({
      model: this.config.llm.model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  private async chatAnthropic(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.llm.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": requireEnv(this.config.llm.apiKeyEnv),
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.config.llm.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status}`);
    }
    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return payload.content?.find((part) => part.type === "text")?.text ?? "";
  }
}
