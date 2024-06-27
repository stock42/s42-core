import { type Server } from 'node:http';
import { type Controller } from '../Controller/index.js';
import { type TypeReturnCallback } from './types.d.js';
export declare class RouteControllers {
    private readonly localControllers;
    private localServerHTTP;
    private routesMapCache;
    static instance: RouteControllers;
    constructor(controllers: Controller[]);
    private processAllControllers;
    setServer(server: Server): void;
    listen(port: number): void;
    private checkRoute;
    private setHeaders;
    private getJSONBody;
    private getQueryParams;
    private getRequestObject;
    private getResponseObject;
    private notFound;
    private serverError;
    getCallback(): TypeReturnCallback;
    static getInstance(controllers: Controller[]): RouteControllers;
}
