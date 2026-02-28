declare module 'sql.js' {
  export default function initSqlJs(config?: object): Promise<SqlJsStatic>;
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => SqlJsDatabase;
  }
  export interface SqlJsDatabase {
    run(sql: string, params?: unknown[]): void;
    prepare(sql: string): SqlJsStatement;
    export(): Uint8Array;
    close(): void;
  }
  export interface SqlJsStatement {
    run(params?: unknown[]): void;
    free(): void;
  }
}
