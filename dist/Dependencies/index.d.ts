export declare class Dependencies {
    private static dependencies;
    static add<DEP>(name: string, dep: DEP): void;
    static get<DEP>(name: string): DEP | null;
}
