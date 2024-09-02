import { type IncomingMessage, type ServerResponse } from 'http';
export type TypeSSEventToSend = {
    eventName: string;
    eventPayload: {
        [key: string]: string;
    };
};
export declare class SSE {
    private Response;
    private readonly uuid;
    private localID;
    constructor(req: IncomingMessage, res: ServerResponse);
    getUUID(): string;
    private sendHello;
    private controllerPath;
    send(data: TypeSSEventToSend): void;
    close(): void;
}
