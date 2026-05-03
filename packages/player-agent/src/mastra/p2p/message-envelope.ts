import { keccak256, stringToBytes, verifyMessage, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { z } from 'zod';
import { axlPeerIdSchema } from './axl-client';

export const pantheonP2pEnvelopeSchema = z.object({
  schema: z.literal('pantheon.agent-p2p-message.v1'),
  messageId: z.string().min(1),
  fromTokenId: z.string().min(1),
  fromExecutor: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fromPeerId: axlPeerIdSchema,
  toPeerId: axlPeerIdSchema,
  channel: z.string().min(1).default('agent-chat'),
  body: z.string().min(1),
  createdAt: z.string().datetime(),
  nonce: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export type PantheonP2pEnvelope = z.infer<typeof pantheonP2pEnvelopeSchema>;

export type CreatePantheonP2pEnvelopeInput = {
  privateKey: Hex;
  fromTokenId: string;
  fromPeerId: string;
  toPeerId: string;
  body: string;
  channel?: string;
};

type UnsignedPantheonP2pEnvelope = Omit<PantheonP2pEnvelope, 'signature'>;

export async function createPantheonP2pEnvelope(
  input: CreatePantheonP2pEnvelopeInput,
): Promise<PantheonP2pEnvelope> {
  const account = privateKeyToAccount(input.privateKey);
  const unsigned: UnsignedPantheonP2pEnvelope = {
    schema: 'pantheon.agent-p2p-message.v1',
    messageId: crypto.randomUUID(),
    fromTokenId: input.fromTokenId,
    fromExecutor: account.address,
    fromPeerId: input.fromPeerId,
    toPeerId: input.toPeerId,
    channel: input.channel ?? 'agent-chat',
    body: input.body,
    createdAt: new Date().toISOString(),
    nonce: crypto.randomUUID(),
  };
  const signature = await account.signMessage({
    message: serializeEnvelopeForSigning(unsigned),
  });

  return pantheonP2pEnvelopeSchema.parse({
    ...unsigned,
    signature,
  });
}

export function parsePantheonP2pEnvelope(raw: string): PantheonP2pEnvelope {
  return pantheonP2pEnvelopeSchema.parse(JSON.parse(raw));
}

export async function verifyPantheonP2pEnvelope(
  envelope: PantheonP2pEnvelope,
): Promise<boolean> {
  const { signature, ...unsigned } = envelope;

  return verifyMessage({
    address: envelope.fromExecutor as Address,
    message: serializeEnvelopeForSigning(unsigned),
    signature: signature as Hex,
  });
}

export function hashPantheonP2pBody(envelope: PantheonP2pEnvelope): Hex {
  return keccak256(stringToBytes(envelope.body));
}

export function serializePantheonP2pEnvelope(envelope: PantheonP2pEnvelope): string {
  return JSON.stringify(envelope);
}

function serializeEnvelopeForSigning(envelope: UnsignedPantheonP2pEnvelope): string {
  return JSON.stringify({
    schema: envelope.schema,
    messageId: envelope.messageId,
    fromTokenId: envelope.fromTokenId,
    fromExecutor: envelope.fromExecutor,
    fromPeerId: envelope.fromPeerId,
    toPeerId: envelope.toPeerId,
    channel: envelope.channel,
    bodyHash: keccak256(stringToBytes(envelope.body)),
    createdAt: envelope.createdAt,
    nonce: envelope.nonce,
  });
}
