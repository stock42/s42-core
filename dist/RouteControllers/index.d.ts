import { type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { type Controller } from '../Controller/index.js';
import { type TypeReturnCallback } from './types.d.js';
type TypeRequest = IncomingMessage & {
    [key: string]: unknown;
};
export declare class RouteControllers {
    private readonly localControllers;
    private Headers;
    private Response;
    private localServerHTTP;
    private routesMapCache;
    private localMWS;
    static instance: RouteControllers;
    constructor(controllers: Controller[]);
    private processAllControllers;
    setServer(server: Server): void;
    listen(port: number): void;
    private checkRoute;
    private setResponseHeaders;
    private setHeaders;
    addHeader(header: string, value: string): void;
    getHeadersToSend(): {
        [key: string]: string;
    };
    clearAllHeaders(): void;
    private getJSONBody;
    private getQueryParams;
    private getRequestObject;
    private getResponseObject;
    private notFound;
    private serverError;
    addGlobal(callback: (req: TypeRequest, res: ServerResponse, next?: (req: TypeRequest, res: ServerResponse) => void) => void): void;
    getCallback(): TypeReturnCallback;
    static getInstance(controllers: Controller[]): RouteControllers;
}
export {};
