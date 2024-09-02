import { randomUUID } from 'crypto';
export class SSE {
    Response;
    uuid;
    localID;
    constructor(req, res) {
        this.Response = res;
        this.localID = 0;
        this.uuid = randomUUID();
        this.controllerPath();
        this.sendHello();
    }
    getUUID() {
        return this.uuid;
    }
    sendHello() {
        this.send({
            eventName: 'welcome',
            eventPayload: {
                uuid: this.uuid,
            },
        });
    }
    controllerPath() {
        this.Response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        this.Response.flushHeaders();
    }
    send(data) {
        const formattedData = `id: ${this.localID++}\nevent: ${data.eventName}\ndata: ${JSON.stringify(data.eventPayload)}\n\n`;
        try {
            this.Response.write(formattedData);
        }
        catch (error) {
            console.error('Error sending SSE data:', error);
        }
    }
    close() {
        try {
            this.Response.end();
        }
        catch (error) {
            console.error('Error closing SSE connection:', error);
        }
    }
}
