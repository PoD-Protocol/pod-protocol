export interface PhotonCompressedMessage {
    channel: string;
    sender: string;
    content_hash: string;
    ipfs_hash: string;
    message_type: string;
    created_at: number;
    edited_at?: number;
    reply_to?: string;
}
export interface QueryOptions {
    limit?: number;
    offset?: number;
    sender?: string | null;
    after?: number | null;
    before?: number | null;
}
export declare class PhotonIndexerClient {
    private endpoint;
    constructor(endpoint: string);
    getCompressedMessagesByChannel(channelId: string, options?: QueryOptions): Promise<PhotonCompressedMessage[]>;
}
