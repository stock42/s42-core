export interface EventsDomainsInterface {
    listenEvent: (eventName: string, callback: () => void) => void;
    emitEvent: (eventName: string, payload: object) => void;
}
