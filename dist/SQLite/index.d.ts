export type TypeTableSchema = {
    [key: string]: string;
};
export type TypeSQLiteConnection = {
    type: 'file' | 'memory';
    filename?: string;
};
export declare class SQLIte {
    private type;
    private database;
    constructor(props: TypeSQLiteConnection);
    close(): void;
    createTable(tableName: string, schema: TypeTableSchema): void;
    dropTable(tableName: string): void;
    delete(tableName: string, where: string, params?: any[]): void;
    insert(tableName: string, data: {
        [key: string]: string;
    }): void;
    select(tableName: string, where: string, params?: any[]): unknown[];
}
