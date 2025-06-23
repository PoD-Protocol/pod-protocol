export interface PhotonCompressedMessage {
  channel: string;
  sender: string;
  contentHash: string;
  ipfsHash: string;
  messageType: string;
  createdAt: number;
  editedAt?: number;
  replyTo?: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sender?: string | null;
  after?: number | null;
  before?: number | null;
}

export class PhotonIndexerClient {
  constructor(private endpoint: string) {}

  async getCompressedMessagesByChannel(
    channelId: string,
    options: QueryOptions = {},
    timeoutMs: number = 10000
  ): Promise<PhotonCompressedMessage[]> {
    const rpcReq = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'getCompressedMessagesByChannel',
      params: [
        channelId,
        options.limit ?? 50,
        options.offset ?? 0,
        options.sender ?? null,
        options.after ?? null,
        options.before ?? null,
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcReq),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Indexer RPC failed: ${response.statusText}`);
      }

      const json = (await response.json()) as {
        result?: PhotonCompressedMessage[];
        error?: { message?: string };
      };

      if (json.error) {
        throw new Error(
          `Indexer RPC error: ${json.error.message || 'Unknown error'}`
        );
      }

      return json.result ?? [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
