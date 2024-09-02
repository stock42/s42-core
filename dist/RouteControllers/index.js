import { jsonParse } from '../JSONParse/index.js';
export class RouteControllers {
    localControllers;
    Headers = {};
    Response = null;
    localServerHTTP;
    routesMapCache = {};
    localMWS = [];
    static instance;
    constructor(controllers) {
        this.localControllers = controllers;
        this.localServerHTTP = null;
        this.processAllControllers();
    }
    processAllControllers() {
        this.localControllers.forEach(controller => {
            controller.getMethods().forEach((method) => {
                this.routesMapCache[`${method}:${controller.getPath()}`] =
                    controller.getCallback();
            });
        });
        return this;
    }
    setServer(server) {
        this.localServerHTTP = server;
    }
    listen(port) {
        if (!this.localServerHTTP) {
            throw new Error('Not Server setted');
        }
        try {
            this.localServerHTTP.listen(port, () => {
                console.info(`Ready on *: ${port}`);
            });
        }
        catch (err) {
            throw new Error(`Error listener: ${err}`);
        }
    }
    checkRoute(route) {
        const result = {
            exists: false,
            params: {},
            key: '',
        };
        const [purePath] = route.split('?');
        const [method] = purePath.split(':');
        for (const key in this.routesMapCache) {
            const [routeMethod] = key.split(':');
            if (method !== routeMethod) {
                continue;
            }
            const keyParts = key.split('/');
            const routeParts = purePath.split('/');
            if (keyParts.length !== routeParts.length) {
                continue;
            }
            keyParts.shift();
            routeParts.shift();
            let isMatch = true;
            const params = {};
            for (let i = 0; i < keyParts.length; i++) {
                if (keyParts[i].startsWith(':')) {
                    const paramName = keyParts[i].substring(1);
                    params[paramName] = routeParts[i];
                }
                else if (keyParts[i] !== routeParts[i]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                result.exists = true;
                result.params = params;
                result.key = key;
                break;
            }
        }
        return result;
    }
    setResponseHeaders() {
        if (this.Response) {
            Object.entries(this.Headers).forEach(([header, value]) => {
                this.Response?.setHeader(header, value);
            });
        }
    }
    setHeaders() {
        this.addHeader('Surrogate-Control', 'no-store');
        this.addHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        this.addHeader('Pragma', 'no-cache');
        this.addHeader('Expires', '0');
        this.addHeader('Access-Control-Allow-Origin', '*');
        this.addHeader('Access-Control-Allow-Credentials', 'true');
        this.addHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        this.addHeader('Access-Control-Expose-Headers', 'Content-Length');
        this.addHeader('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range, apikey, x-access-token');
        this.addHeader('Content-Security-Policy', "default-src 'self' data: gap: https://ssl.gstatic.com 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src *; img-src 'self' data: content:;");
    }
    addHeader(header, value) {
        this.Headers[header] = value;
    }
    getHeadersToSend() {
        return this.Headers;
    }
    clearAllHeaders() {
        this.Headers = {};
    }
    async getJSONBody(req) {
        try {
            const data = await jsonParse(req);
            return data;
        }
        catch (err) {
            return {};
        }
    }
    getQueryParams(url) {
        const queryParams = {};
        const [, query] = url.split('?');
        if (query) {
            query.split('&').forEach(param => {
                const [key, value] = param.split('=');
                queryParams[key] = decodeURIComponent(value);
            });
        }
        return queryParams;
    }
    async getRequestObject(req) {
        let realIp = '::1';
        if (req.headers && req.headers['x-forwarded-for']) {
            const parts = String(req?.headers['x-forwarded-for']).split(',');
            realIp = String(parts.shift());
        }
        if (req.socket.remoteAddress) {
            realIp = String(req.socket.remoteAddress);
        }
        return {
            headers: { ...(req?.headers ?? {}) },
            realIp,
            query: this.getQueryParams(String(req.url)),
            body: req.method !== 'GET' ? await this.getJSONBody(req) : {},
            url: req.url,
            method: req.method,
        };
    }
    getResponseObject(res) {
        return {
            end: (body) => res.end(body),
            json: (body) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(body));
            },
            jsonError: (body) => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(body));
            },
            _404: (body) => {
                this.notFound(res, body);
            },
            _500: (body) => {
                this.serverError(res, body);
            },
        };
    }
    notFound(res, message = 'Not Found') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(message);
    }
    serverError(res, message = 'Internal Server Error') {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(message);
    }
    addGlobal(callback) {
        this.routesMapCache['*:*'] = callback;
    }
    getCallback() {
        return async (req, res) => {
            this.Response = res;
            try {
                const resultCheckPath = this.checkRoute(`${req.method}:${req.url}`);
                if (resultCheckPath.exists) {
                    this.setHeaders();
                    this.setResponseHeaders();
                    if (req.method === 'OPTIONS') {
                        return res.writeHead(200);
                    }
                    const request = await this.getRequestObject(req);
                    const response = this.getResponseObject(res);
                    if (this.routesMapCache['*:*']) {
                        return this.routesMapCache['*:*'](request, response, this.routesMapCache[resultCheckPath.key]);
                    }
                    return this.routesMapCache[resultCheckPath.key](request, response);
                }
                return this.notFound(res);
            }
            catch (err) {
                console.info('Internal Route Controllers Error: ', err);
                return this.serverError(res);
            }
        };
    }
    static getInstance(controllers) {
        if (!RouteControllers.instance) {
            RouteControllers.instance = new RouteControllers(controllers);
        }
        return RouteControllers.instance;
    }
}
