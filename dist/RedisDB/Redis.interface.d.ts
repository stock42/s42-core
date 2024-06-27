export interface RedisInterface {
    close: () => void;
    hset: (key: string, value: object) => Promise<void>;
    hget: (key: string, subkey: string) => Promise<string | null>;
    subscribe: (channelName: string, callback: (payload: object) => void) => void;
    publish: (channelName: string, payload: object) => void;
}
