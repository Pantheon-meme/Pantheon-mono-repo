import { keccak256, stringToHex, toBytes, type Hex } from 'viem';
import {
  agentMemoryDeltaSchema,
  agentPermissionBits,
  type AgentMemoryDelta,
} from '../agent-capsules/agent-capsule';
import {
  type AppendAgentMemoryInput,
  PantheonInftClient,
} from './inft-client';

export type AgentMemoryObservationInput = AgentMemoryDelta['observations'][number];

export type CreateAgentMemoryDeltaInput = {
  tokenId: string;
  executor: Hex;
  turnId: string;
  action: string;
  summary: string;
  observations?: AgentMemoryObservationInput[];
};

export type WriteAgentMemoryDeltaInput = Omit<
  CreateAgentMemoryDeltaInput,
  'tokenId' | 'executor'
> & {
  encryptedDeltaURI?: string;
};

export function createAgentMemoryDelta(
  input: CreateAgentMemoryDeltaInput,
): AgentMemoryDelta {
  return agentMemoryDeltaSchema.parse({
    schema: 'pantheon.agent-memory-delta.v1',
    observations: [],
    ...input,
  });
}

export function hashAgentMemoryDelta(delta: AgentMemoryDelta): Hex {
  return keccak256(toBytes(JSON.stringify(delta)));
}

export function agentMemoryActionBytes(action: string): Hex {
  return stringToHex(action, { size: 32 });
}

export async function writeAgentMemoryDelta(
  client: PantheonInftClient,
  input: WriteAgentMemoryDeltaInput,
): Promise<Hex> {
  await client.assertAuthorized(agentPermissionBits.canAppendMemory);

  const delta = createAgentMemoryDelta({
    tokenId: client.agentTokenId.toString(),
    executor: client.executorAddress,
    ...input,
  });
  const appendInput: AppendAgentMemoryInput = {
    encryptedDeltaURI:
      input.encryptedDeltaURI ??
      `0g-storage://local-dev/agents/${client.agentTokenId.toString()}/memory-deltas/${input.turnId}.json`,
    deltaHash: hashAgentMemoryDelta(delta),
    action: agentMemoryActionBytes(input.action),
  };

  return client.appendMemory(appendInput);
}
