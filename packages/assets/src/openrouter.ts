import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

import { textAssetSchema, type GeneratedImage, type TextAsset } from "./schemas.js";

type OpenRouterConfig = {
  apiKey?: string;
  siteUrl?: string;
  appName?: string;
};

type OpenRouterImageResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      images?: Array<{
        type?: string;
        image_url?: {
          url?: string;
        };
        imageUrl?: {
          url?: string;
        };
      }>;
    };
  }>;
};

export function readOpenRouterConfig(): Required<OpenRouterConfig> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }

  return {
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL ?? "http://localhost",
    appName: process.env.OPENROUTER_APP_NAME ?? "Pantheon",
  };
}

export async function generateWorldTextAssets(args: {
  worldPrompt: string;
  textModel: string;
  assetCount: number;
  styleGuide?: string;
  config?: OpenRouterConfig;
}): Promise<TextAsset> {
  const config = { ...readOpenRouterConfig(), ...args.config };
  const openrouter = createOpenRouter({
    apiKey: config.apiKey,
    headers: {
      "HTTP-Referer": config.siteUrl,
      "X-Title": config.appName,
    },
  });

  const { object } = await generateObject({
    model: openrouter(args.textModel),
    schema: textAssetSchema,
    prompt: [
      "Create reusable game-world asset planning data for Pantheon.",
      "Return concise, production-friendly concepts that can drive game art and metadata generation.",
      `Create exactly ${args.assetCount} image prompts.`,
      args.styleGuide ? `Style guide: ${args.styleGuide}` : undefined,
      `World brief: ${args.worldPrompt}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  return object;
}

export async function generateOpenRouterImage(args: {
  id: string;
  title: string;
  prompt: string;
  imageModel: string;
  config?: OpenRouterConfig;
}): Promise<GeneratedImage> {
  const config = { ...readOpenRouterConfig(), ...args.config };
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.siteUrl,
      "X-Title": config.appName,
    },
    body: JSON.stringify({
      model: args.imageModel,
      messages: [
        {
          role: "user",
          content: args.prompt,
        },
      ],
      modalities: ["image", "text"],
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter image request failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as OpenRouterImageResponse;
  const message = result.choices?.[0]?.message;
  const image = message?.images?.[0];
  const dataUrl = image?.image_url?.url ?? image?.imageUrl?.url;

  if (!dataUrl) {
    throw new Error(`OpenRouter image model returned no image for "${args.title}".`);
  }

  return {
    id: args.id,
    title: args.title,
    prompt: args.prompt,
    model: args.imageModel,
    contentType: getDataUrlContentType(dataUrl),
    dataUrl,
  };
}

export function parseJsonTextAsset(value: unknown): TextAsset {
  return textAssetSchema.parse(value);
}

export function getDataUrlContentType(dataUrl: string): string {
  const match = z.string().regex(/^data:([^;]+);base64,/).safeParse(dataUrl);

  if (!match.success) {
    return "application/octet-stream";
  }

  return dataUrl.slice("data:".length, dataUrl.indexOf(";base64,"));
}
