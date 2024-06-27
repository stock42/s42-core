import { type RedisClient } from '../index.js';
import { type EventsDomainsInterface } from './eventsDomainInterface.js';
import { type TypeEvent } from './types';
export declare class EventsDomain implements EventsDomainsInterface {
    private readonly channelNameToSubscribe;
    private processUUID;
    private registeredEvents;
    private localEventsRegistered;
    private static instance;
    private redisInstance;
    private intervalId;
    constructor(redisInstance: RedisClient, uuid: string);
    private sendCommandToRedis;
    private notifyMyAllEventsRegistered;
    close(): void;
    private receiveCommandsFromRedis;
    getAllRegisteredEvents(): {
        [key: string]: TypeEvent;
    };
    private getInternalEventChannelName;
    listenEvent<TypePayload>(eventName: string, callback: (payload: TypePayload) => void): void;
    private registerEvent;
    private isEventRegistered;
    registerEventListenerInstance(eventName: string, instanceId: string): void;
    removeAllInstanceListeners(instanceId: string): void;
    static getInstance(redisInstance: RedisClient, uuid: string): EventsDomain;
    private getNextInstanceId;
    emitEvent(eventName: string, payload: object): boolean;
}
