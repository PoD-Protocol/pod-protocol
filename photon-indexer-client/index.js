export class PhotonClient {
  constructor(config) {
    this.endpoint = config.endpoint;
  }
  async getCompressedMessagesByChannel(channel, options) {
    const body = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'getCompressedMessagesByChannel',
      params: [
        channel,
        options.limit ?? 50,
        options.offset ?? 0,
        options.sender ?? null,
        options.after ?? null,
        options.before ?? null
      ]
    };
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Indexer RPC failed: ${response.statusText}`);
    }
    const json = await response.json();
    if (json.error) {
      throw new Error(`Indexer RPC error: ${json.error.message}`);
    }
    return json.result || [];
  }
}
