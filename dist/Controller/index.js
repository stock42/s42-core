export class Controller {
    path = '';
    methods = [];
    callbacks = [];
    constructor() {
        return this;
    }
    getMethods() {
        return this.methods;
    }
    setPath(path) {
        this.path = path;
        return this;
    }
    getPath() {
        return this.path;
    }
    update() {
        const method = 'UPDATE';
        if (this.methods.indexOf(method) === -1) {
            this.methods.push(method);
        }
        return this;
    }
    patch() {
        const method = 'PATCH';
        if (this.methods.indexOf(method) === -1) {
            this.methods.push(method);
        }
        return this;
    }
    options() {
        const method = 'OPTIONS';
        if (this.methods.indexOf(method) === -1) {
            this.methods.push(method);
        }
        return this;
    }
    get() {
        const method = 'GET';
        if (this.methods.indexOf(method) === -1) {
            this.methods.push(method);
        }
        return this;
    }
    delete() {
        const method = 'DELETE';
        if (this.methods.indexOf(method) === -1) {
            this.methods.push(method);
        }
        return this;
    }
    post() {
        const method = 'POST';
        if (this.methods.indexOf(method) === -1) {
            this.methods.push(method);
        }
        return this;
    }
    put() {
        const method = 'PUT';
        if (this.methods.indexOf(method) === -1) {
            this.methods.push(method);
        }
        return this;
    }
    use(callback) {
        this.callbacks.push(callback);
        return this;
    }
    getCallback() {
        return async (req, res) => {
            let index = 0;
            const next = () => {
                if (index < this.callbacks.length) {
                    const middleware = this.callbacks[index];
                    index++;
                    middleware(req, res, next);
                }
                else {
                    res.end('End use case');
                }
            };
            try {
                if (this.callbacks.length === 0) {
                    return res.end('No "uses" setted for this endpoint');
                }
                next();
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(`Internal Error: ${err}`);
            }
        };
    }
}
