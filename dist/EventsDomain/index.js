export class EventsDomain {
    channelNameToSubscribe = '$EventsDomain$';
    processUUID;
    registeredEvents = {};
    localEventsRegistered = [];
    static instance;
    redisInstance;
    intervalId;
    constructor(redisInstance, uuid) {
        this.redisInstance = redisInstance;
        this.processUUID = uuid;
        this.receiveCommandsFromRedis();
        this.notifyMyAllEventsRegistered();
    }
    sendCommandToRedis(command) {
        this.redisInstance.publish(this.channelNameToSubscribe, command);
    }
    notifyMyAllEventsRegistered() {
        this.intervalId = setInterval(() => {
            this.localEventsRegistered.forEach(eventName => {
                this.sendCommandToRedis({
                    uuid: this.processUUID,
                    eventName,
                    cmd: 'registerEvent',
                });
            });
        }, 5000);
    }
    close() {
        clearInterval(this.intervalId);
        EventsDomain.instance.redisInstance.publish(EventsDomain.instance.channelNameToSubscribe, {
            uuid: EventsDomain.instance.processUUID,
            cmd: 'removeAllInstanceListeners',
            eventName: '*',
        });
        console.info('eventsCommand closed');
    }
    receiveCommandsFromRedis() {
        this.redisInstance.subscribe(this.channelNameToSubscribe, (eventCommand) => {
            if (eventCommand.uuid === this.processUUID) {
                return false;
            }
            if (eventCommand?.cmd === 'registerEvent') {
                this.registerEventListenerInstance(eventCommand.eventName, eventCommand.uuid);
            }
            if (eventCommand?.cmd === 'removeAllInstanceListeners') {
                this.removeAllInstanceListeners(eventCommand.uuid);
            }
        });
    }
    getAllRegisteredEvents() {
        return this.registeredEvents;
    }
    getInternalEventChannelName(eventName, uuid = this.processUUID) {
        return `${eventName}-${uuid}`;
    }
    listenEvent(eventName, callback) {
        if (!this.isEventRegistered(eventName)) {
            this.registerEvent(eventName);
            this.localEventsRegistered.push(eventName);
            this.redisInstance.subscribe(this.getInternalEventChannelName(eventName), callback);
            this.registerEventListenerInstance(eventName, this.processUUID);
            this.sendCommandToRedis({
                uuid: this.processUUID,
                eventName,
                cmd: 'registerEvent',
            });
        }
    }
    registerEvent(eventName) {
        if (!this.isEventRegistered(eventName)) {
            this.registeredEvents[eventName] = {
                instances: [],
                currentCursor: 0,
            };
        }
    }
    isEventRegistered(eventName) {
        return !!this.registeredEvents[eventName];
    }
    registerEventListenerInstance(eventName, instanceId) {
        if (!this.isEventRegistered(eventName)) {
            this.registerEvent(eventName);
        }
        if (this.registeredEvents[eventName].instances.indexOf(instanceId) === -1) {
            this.registeredEvents[eventName].instances.push(instanceId);
        }
    }
    removeAllInstanceListeners(instanceId) {
        for (const eventName in this.registeredEvents) {
            const event = this.registeredEvents[eventName];
            console.info('event: ', event);
            event.instances = event.instances.filter(id => id !== instanceId);
            this.registeredEvents[eventName] = event;
        }
    }
    static getInstance(redisInstance, uuid) {
        if (!this.instance) {
            this.instance = new EventsDomain(redisInstance, uuid);
        }
        return this.instance;
    }
    getNextInstanceId(eventName) {
        if (this.registeredEvents[eventName].currentCursor >=
            this.registeredEvents[eventName].instances.length) {
            this.registeredEvents[eventName].currentCursor = 0;
        }
        const nextInstanceId = this.registeredEvents[eventName].instances[this.registeredEvents[eventName].currentCursor];
        this.registeredEvents[eventName].currentCursor++;
        return nextInstanceId;
    }
    emitEvent(eventName, payload) {
        if (!this.isEventRegistered(eventName)) {
            return false;
        }
        const nextInstanceId = this.getNextInstanceId(eventName);
        this.redisInstance.publish(this.getInternalEventChannelName(eventName, nextInstanceId), payload);
        return true;
    }
}
