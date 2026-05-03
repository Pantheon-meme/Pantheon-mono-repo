import { keccak256, stringToHex, toBytes, type Hex } from 'viem';
import {
  agentMemoryDeltaSchema,
  agentPermissionBits,
  type AgentMemoryDelta,
} from '../agent-capsules/agent-capsule';
import {
  type AppendAgentMemoryInput,
  type IntelligentDataCommitment,
  PantheonInftClient,
} from './inft-client';
import { uploadJsonToZeroGStorage, type ZeroGStorageUploadResult } from '../zerog/storage';

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
  metadata?: Record<string, unknown>;
  uploadToZeroG?: boolean;
  updateInftIntelligentData?: boolean;
  intelligentDataDescription?: string;
  intelligentDataClient?: PantheonInftClient;
};

export type WriteAgentMemoryDeltaResult = {
  txHash: Hex;
  delta: AgentMemoryDelta;
  encryptedDeltaURI: string;
  deltaHash: Hex;
  storage?: ZeroGStorageUploadResult;
  intelligentData?: {
    description: string;
    dataHash: Hex;
    txHash?: Hex;
    updated: boolean;
    reason?: string;
  };
};

const defaultMemoryDataDescription = 'memory-checkpoint';

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
): Promise<WriteAgentMemoryDeltaResult> {
  await client.assertAuthorized(agentPermissionBits.canAppendMemory);

  const delta = createAgentMemoryDelta({
    tokenId: client.agentTokenId.toString(),
    executor: client.executorAddress,
    ...input,
  });
  const deltaHash = hashAgentMemoryDelta(delta);
  const storage = input.uploadToZeroG === false || input.encryptedDeltaURI
    ? undefined
    : await uploadJsonToZeroGStorage(
        {
          schema: 'erc7857.intelligent-data-file.v1',
          standard: 'ERC-7857',
          dataDescription:
            input.intelligentDataDescription ??
            process.env.AGENT_MEMORY_DATA_DESCRIPTION ??
            defaultMemoryDataDescription,
          content: {
            schema: 'pantheon.agent-memory-delta.v1',
            delta,
          },
          metadata: {
            createdAt: new Date().toISOString(),
            tokenId: client.agentTokenId.toString(),
            executor: client.executorAddress,
            deltaHash,
            ...input.metadata,
          },
        },
        {
          name: `${input.turnId}.json`,
          contentType: 'application/json',
        },
      );
  const appendInput: AppendAgentMemoryInput = {
    encryptedDeltaURI:
      input.encryptedDeltaURI ??
      storage?.uri ??
      `0g-storage://local-dev/agents/${client.agentTokenId.toString()}/memory-deltas/${input.turnId}.json`,
    deltaHash,
    action: agentMemoryActionBytes(input.action),
  };

  const txHash = await client.appendMemory(appendInput);
  const intelligentData = input.updateInftIntelligentData !== false && storage
    ? await updateMemoryIntelligentData(
        client,
        input.intelligentDataClient,
        input.intelligentDataDescription ??
          process.env.AGENT_MEMORY_DATA_DESCRIPTION ??
          defaultMemoryDataDescription,
        storage.rootHash,
      )
    : undefined;

  return {
    txHash,
    delta,
    encryptedDeltaURI: appendInput.encryptedDeltaURI,
    deltaHash,
    storage,
    intelligentData,
  };
}

async function updateMemoryIntelligentData(
  appendClient: PantheonInftClient,
  updateClient: PantheonInftClient | undefined,
  description: string,
  dataHash: Hex,
): Promise<WriteAgentMemoryDeltaResult['intelligentData']> {
  try {
    const client = updateClient ?? appendClient;
    const currentData = await client.getIntelligentData();
    const nextData = replaceOrAppendMemoryCommitment(
      currentData,
      description,
      dataHash,
    );
    const txHash = await client.updateIntelligentData(nextData);

    return {
      description,
      dataHash,
      txHash,
      updated: true,
    };
  } catch (error) {
    return {
      description,
      dataHash,
      updated: false,
      reason: formatError(error),
    };
  }
}

function replaceOrAppendMemoryCommitment(
  data: IntelligentDataCommitment[],
  description: string,
  dataHash: Hex,
): IntelligentDataCommitment[] {
  const memoryDescriptions = new Set([
    description,
    'memory-checkpoint',
    'initial-memory-root',
    'agent-memory',
  ]);
  let replaced = false;
  const nextData = data.map((entry) => {
    if (!memoryDescriptions.has(entry.dataDescription)) {
      return entry;
    }

    replaced = true;
    return {
      dataDescription: description,
      dataHash,
    };
  });

  if (!replaced) {
    nextData.push({
      dataDescription: description,
      dataHash,
    });
  }

  return nextData;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
