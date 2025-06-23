export interface PhotonMessage {
  channel: string;
  sender: string;
  content_hash: string;
  ipfs_hash: string;
  message_type: string;
  created_at: number;
  edited_at?: number;
  reply_to?: string | null;
}

export class PhotonClient {
  constructor(private endpoint: string) {}

  async getCompressedMessagesByChannel(
    channel: string,
    options: {
      limit?: number;
      offset?: number;
      sender?: string | null;
      after?: number | null;
      before?: number | null;
    } = {}
  ): Promise<PhotonMessage[]> {
    const rpcReq = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'getCompressedMessagesByChannel',
      params: [
        channel,
        options.limit ?? 50,
        options.offset ?? 0,
        options.sender ?? null,
        options.after ?? null,
        options.before ?? null,
      ],
    };
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcReq),
    });
    if (!res.ok) {
      throw new Error(`Indexer RPC failed: ${res.statusText}`);
    }
    const json = (await res.json()) as { result?: PhotonMessage[]; error?: { message?: string } };
    if (json.error) {
      throw new Error(`Indexer RPC error: ${json.error?.message || 'Unknown error'}`);
    }
    if (json.result === undefined) {
      throw new Error('Invalid JSON-RPC response: missing result field');
    }
    return json.result;
  }

  async getChannelStats(channel: string): Promise<any> {
    const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/channel-stats/${channel}`);
    if (!res.ok) {
      throw new Error(`Stats query failed: ${res.statusText}`);
    }
    return res.json();
  }
}
