import { z } from "zod";

export const agentPermissionBits = {
  canRunInference: 1n << 0n,
  canActInWorld: 1n << 1n,
  canMove: 1n << 2n,
  canForage: 1n << 3n,
  canSleep: 1n << 4n,
  canPickup: 1n << 5n,
  canDrop: 1n << 6n,
  canPlant: 1n << 7n,
  canHarvest: 1n << 8n,
  canWater: 1n << 9n,
  canTend: 1n << 10n,
  canBankSell: 1n << 11n,
  canBankBuy: 1n << 12n,
  canAppendMemory: 1n << 13n,
  canCheckpointMemory: 1n << 14n,
  canUpdatePublicProfile: 1n << 15n,
  canClone: 1n << 16n,
} as const;

export const defaultPlayerAgentPermissionBits =
  agentPermissionBits.canRunInference |
  agentPermissionBits.canActInWorld |
  agentPermissionBits.canMove |
  agentPermissionBits.canForage |
  agentPermissionBits.canSleep |
  agentPermissionBits.canPickup |
  agentPermissionBits.canPlant |
  agentPermissionBits.canHarvest |
  agentPermissionBits.canBankSell |
  agentPermissionBits.canAppendMemory |
  agentPermissionBits.canUpdatePublicProfile;

export const agentCapsuleSchema = z.object({
  schema: z.literal("pantheon.agent-capsule.v1"),
  tokenId: z.string().min(1),
  agent: z.object({
    name: z.string().min(1),
    archetype: z.string().min(1),
    deity: z.string().optional(),
    homeBiome: z.string().optional(),
    publicDescription: z.string().optional(),
  }),
  personality: z.object({
    voice: z.string().min(1),
    riskTolerance: z.enum(["low", "medium", "high"]),
    economicStyle: z.string().min(1),
    taboos: z.array(z.string()).default([]),
  }),
  strategy: z.object({
    preferredTerrain: z.array(z.string()).default([]),
    avoidTerrain: z.array(z.string()).default([]),
    sleepThreshold: z.number().int().min(0).default(20),
    sellWhenValueAtLeast: z.number().int().min(0).default(48),
    plantWhenSeedsAvailable: z.boolean().default(true),
  }),
  memory: z.object({
    summary: z.string().default(""),
    terrainLearnings: z.array(z.string()).default([]),
    relationships: z.array(z.string()).default([]),
    recentGoals: z.array(z.string()).default([]),
  }),
  runtime: z.object({
    model: z.string().default("configured-by-runtime"),
    toolProfile: z.string().default("economic-cycle-v1"),
    maxToolCallsPerTurn: z.number().int().min(1).max(20).default(3),
  }),
});

export const agentMemoryDeltaSchema = z.object({
  schema: z.literal("pantheon.agent-memory-delta.v1"),
  tokenId: z.string().min(1),
  executor: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  turnId: z.string().min(1),
  action: z.string().min(1),
  summary: z.string().min(1),
  observations: z
    .array(
      z.object({
        kind: z.string().min(1),
        terrainId: z.string().optional(),
        itemId: z.string().optional(),
        peerId: z.string().optional(),
        messageId: z.string().optional(),
        direction: z.enum(["sent", "received"]).optional(),
        channel: z.string().optional(),
        contentHash: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
        fromTokenId: z.string().optional(),
        toPeerId: z.string().optional(),
        amount: z.number().int().optional(),
        x: z.number().int().optional(),
        y: z.number().int().optional(),
      }),
    )
    .default([]),
});

export type AgentCapsule = z.infer<typeof agentCapsuleSchema>;
export type AgentMemoryDelta = z.infer<typeof agentMemoryDeltaSchema>;

export function hasAgentPermission(bits: bigint, required: bigint): boolean {
  return (bits & required) === required;
}

export function encodeAgentPermissionBits(bits: bigint): `0x${string}` {
  return `0x${bits.toString(16).padStart(64, "0")}`;
}
