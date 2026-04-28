import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

import {
  textAssetSchema,
  type GeneratedImage,
  type TextAsset,
} from "./schemas.js";

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

const imageRequestAttempts = 3;

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
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  referenceImageDataUrl?: string;
  referenceImageDataUrls?: string[];
  config?: OpenRouterConfig;
}): Promise<GeneratedImage> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= imageRequestAttempts; attempt += 1) {
    try {
      return await requestOpenRouterImage(args);
    } catch (error) {
      lastError = error;

      if (attempt >= imageRequestAttempts || !isRetryableImageError(error)) {
        throw error;
      }

      const delayMs = 1500 * attempt;
      console.warn(
        `[openrouter] Image request failed on attempt ${attempt}; retrying in ${delayMs}ms. ${formatErrorMessage(error)}`,
      );
      await delay(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function requestOpenRouterImage(args: {
  id: string;
  title: string;
  prompt: string;
  imageModel: string;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  referenceImageDataUrl?: string;
  referenceImageDataUrls?: string[];
  config?: OpenRouterConfig;
}): Promise<GeneratedImage> {
  const config = { ...readOpenRouterConfig(), ...args.config };
  const referenceImageDataUrls =
    args.referenceImageDataUrls ??
    (args.referenceImageDataUrl ? [args.referenceImageDataUrl] : []);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.siteUrl,
        "X-Title": config.appName,
      },
      body: JSON.stringify({
        model: args.imageModel,
        reasoning: args.reasoningEffort
          ? {
              effort: args.reasoningEffort,
              exclude: true,
            }
          : undefined,
        messages: [
          {
            role: "user",
            content:
              referenceImageDataUrls.length > 0
                ? [
                    {
                      type: "text",
                      text: args.prompt,
                    },
                    ...referenceImageDataUrls.map((url) => ({
                      type: "image_url",
                      image_url: {
                        url,
                      },
                    })),
                  ]
                : args.prompt,
          },
        ],
        modalities: ["image", "text"],
        stream: false,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenRouter image request failed (${response.status}): ${body}`,
    );
  }

  const result = (await response.json()) as OpenRouterImageResponse;
  const message = result.choices?.[0]?.message;
  const image = message?.images?.[0];
  const dataUrl = image?.image_url?.url ?? image?.imageUrl?.url;

  if (!dataUrl) {
    throw new Error(
      `OpenRouter image model returned no image for "${args.title}".`,
    );
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

function isRetryableImageError(error: unknown): boolean {
  const message = formatErrorMessage(error).toLowerCase();

  return (
    message.includes("terminated") ||
    message.includes("bad gateway") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseJsonTextAsset(value: unknown): TextAsset {
  return textAssetSchema.parse(value);
}

export function getDataUrlContentType(dataUrl: string): string {
  const match = z
    .string()
    .regex(/^data:([^;]+);base64,/)
    .safeParse(dataUrl);

  if (!match.success) {
    return "application/octet-stream";
  }

  return dataUrl.slice("data:".length, dataUrl.indexOf(";base64,"));
}
