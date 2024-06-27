import { type ControllerInterface } from './controller.interface.js';
import { type TYPE_HTTP_METHOD, type Middleware } from './types.d.js';
export declare class Controller implements ControllerInterface {
    private path;
    private methods;
    private callbacks;
    constructor();
    getMethods(): TYPE_HTTP_METHOD[];
    setPath(path: string): this;
    getPath(): string;
    update(): this;
    patch(): this;
    options(): this;
    get(): this;
    delete(): this;
    post(): this;
    put(): this;
    use(callback: (req: any, res: any, next?: Middleware) => void): this;
    getCallback(): (req: any, res: any) => void;
}
