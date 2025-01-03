import { type RedisClient } from '../RedisDB';
import { type EventsDomainsInterface } from './eventsDomainInterface';
import { type TypeEvent, type TypeEventCommandRedis } from './types';

export class EventsDomain implements EventsDomainsInterface {
  private static instance: EventsDomain;
  private readonly channelNameToSubscribe = '$EventsDomain$';
  private readonly processUUID: string;
  private readonly registeredEvents: Record<string, TypeEvent> = {};
  private readonly localEventsRegistered: string[] = [];
  private readonly redisInstance: RedisClient;
  private intervalId: NodeJS.Timer | null = null;

  private constructor(redisInstance: RedisClient, uuid: string) {
    this.redisInstance = redisInstance;
    this.processUUID = uuid;

    this.receiveCommandsFromRedis();
    this.notifyRegisteredEvents();
  }

  /**
   * Sends a command to Redis to manage events.
   */
  private sendCommandToRedis(command: TypeEventCommandRedis): void {
    this.redisInstance.publish(this.channelNameToSubscribe, command);
  }

  /**
   * Notifies the registered events periodically.
   */
  private notifyRegisteredEvents(): void {
    this.intervalId = setInterval(() => {
      for (const eventName of this.localEventsRegistered) {
        this.sendCommandToRedis({
          uuid: this.processUUID,
          eventName,
          cmd: 'registerEvent',
        });
      }
    }, 5000);
  }

  /**
   * Stops notifying registered events and cleans up resources.
   */
  public close(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.redisInstance.publish(this.channelNameToSubscribe, {
      uuid: this.processUUID,
      cmd: 'removeAllInstanceListeners',
      eventName: '*',
    });
  }

  /**
   * Listens for commands sent through Redis.
   */
  private receiveCommandsFromRedis(): void {
    this.redisInstance.subscribe<TypeEventCommandRedis>(
      this.channelNameToSubscribe,
      (eventCommand: TypeEventCommandRedis) => {
        if (eventCommand.uuid === this.processUUID) {
          return;
        }

        switch (eventCommand.cmd) {
          case 'registerEvent':
            this.registerEventListenerInstance(eventCommand.eventName, eventCommand.uuid);
            break;
          case 'removeAllInstanceListeners':
            this.removeAllInstanceListeners(eventCommand.uuid);
            break;
        }
      },
    );
  }

  /**
   * Returns all registered events.
   */
  public getAllRegisteredEvents(): Record<string, TypeEvent> {
    return this.registeredEvents;
  }

  /**
   * Returns the internal channel name for an event and instance.
   */
  private getInternalEventChannelName(eventName: string, uuid: string = this.processUUID): string {
    return `${eventName}-${uuid}`;
  }

  /**
   * Registers and listens to a specific event.
   */
  public listenEvent<TypePayload>(
    eventName: string,
    callback: (payload: TypePayload) => void,
  ): void {
    if (!this.isEventRegistered(eventName)) {
      this.registerEvent(eventName);
    }

    if (!this.localEventsRegistered.includes(eventName)) {
      this.localEventsRegistered.push(eventName);
    }

    this.redisInstance.subscribe(this.getInternalEventChannelName(eventName), callback);
    this.registerEventListenerInstance(eventName, this.processUUID);
    this.sendCommandToRedis({
      uuid: this.processUUID,
      eventName,
      cmd: 'registerEvent',
    });
  }

  /**
   * Registers an event if not already registered.
   */
  private registerEvent(eventName: string): void {
    if (!this.isEventRegistered(eventName)) {
      this.registeredEvents[eventName] = {
        instances: [],
        currentCursor: 0,
      };
    }
  }

  /**
   * Checks if an event is registered.
   */
  private isEventRegistered(eventName: string): boolean {
    return !!this.registeredEvents[eventName];
  }

  /**
   * Registers a listener instance for an event.
   */
  public registerEventListenerInstance(eventName: string, instanceId: string): void {
    if (!this.isEventRegistered(eventName)) {
      this.registerEvent(eventName);
    }

    const instances = this.registeredEvents[eventName].instances;
    if (!instances.includes(instanceId)) {
      instances.push(instanceId);
    }
  }

  /**
   * Removes all listeners for a specific instance.
   */
  public removeAllInstanceListeners(instanceId: string): void {
    for (const eventName in this.registeredEvents) {
      const event = this.registeredEvents[eventName];
      event.instances = event.instances.filter((id) => id !== instanceId);
    }
  }

  /**
   * Returns the next instance ID to handle the event.
   */
  private getNextInstanceId(eventName: string): string {
    const event = this.registeredEvents[eventName];
    if (!event.instances.length) {
      throw new Error(`No instances available for event: ${eventName}`);
    }
    const nextInstanceId = event.instances[event.currentCursor];
    event.currentCursor = (event.currentCursor + 1) % event.instances.length;

    return nextInstanceId;
  }

  /**
   * Emits an event to the next available instance.
   */
  public emitEvent(eventName: string, payload: object): boolean {
    if (!this.isEventRegistered(eventName)) {
      return false;
    }

    try {
      const nextInstanceId = this.getNextInstanceId(eventName);
      this.redisInstance.publish(
        this.getInternalEventChannelName(eventName, nextInstanceId),
        payload,
      );
      return true;
    } catch (err) {
      console.error(`Failed to emit event "${eventName}":`, err);
      return false;
    }
  }

  /**
   * Returns a singleton instance of EventsDomain.
   */
  public static getInstance(redisInstance: RedisClient, uuid: string): EventsDomain {
    if (!EventsDomain.instance) {
      EventsDomain.instance = new EventsDomain(redisInstance, uuid);
    }
    return EventsDomain.instance;
  }
}
