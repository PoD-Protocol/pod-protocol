export class PhotonIndexerClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    async getCompressedMessagesByChannel(channelId, options = {}) {
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
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rpcReq),
        });
        if (!response.ok) {
            throw new Error(`Indexer RPC failed: ${response.statusText}`);
        }
        const json = await response.json();
        if (json.error) {
            throw new Error(`Indexer RPC error: ${json.error.message || 'Unknown error'}`);
        }
        return json.result ?? [];
    }
}
