import { z } from 'zod';

const defaultAxlBaseUrl = 'http://127.0.0.1:9002';

export const axlPeerIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{64}$/, 'AXL peer id must be a 64-character hex ed25519 public key');

const topologySchema = z.object({
  our_ipv6: z.string().optional(),
  our_public_key: axlPeerIdSchema,
  peers: z.array(z.unknown()).optional(),
  tree: z.array(z.unknown()).optional(),
});

export type AxlTopology = z.infer<typeof topologySchema>;

export type AxlReceivedMessage = {
  fromPeerId: string;
  body: string;
};

export class AxlClient {
  constructor(private readonly baseUrl = process.env.AXL_BASE_URL ?? defaultAxlBaseUrl) {}

  async getTopology(): Promise<AxlTopology> {
    const response = await fetch(new URL('/topology', this.baseUrl));

    if (!response.ok) {
      throw new Error(`AXL topology failed: ${response.status} ${response.statusText}`);
    }

    return topologySchema.parse(await response.json());
  }

  async getPeerId(): Promise<string> {
    const topology = await this.getTopology();
    return topology.our_public_key;
  }

  async send(peerId: string, body: string): Promise<number> {
    axlPeerIdSchema.parse(peerId);

    const response = await fetch(new URL('/send', this.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Destination-Peer-Id': peerId,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`AXL send failed: ${response.status} ${response.statusText}`);
    }

    return Number.parseInt(response.headers.get('X-Sent-Bytes') ?? '0', 10);
  }

  async receive(): Promise<AxlReceivedMessage | undefined> {
    const response = await fetch(new URL('/recv', this.baseUrl));

    if (response.status === 204) return undefined;
    if (!response.ok) {
      throw new Error(`AXL recv failed: ${response.status} ${response.statusText}`);
    }

    const fromPeerId = response.headers.get('X-From-Peer-Id');
    if (!fromPeerId) {
      throw new Error('AXL recv response is missing X-From-Peer-Id');
    }

    return {
      fromPeerId,
      body: await response.text(),
    };
  }
}
