declare module 'chunk-promise' {
    export function chunkPromise(
        promises: (() => Promise<unknown>)[],
        options?: {
            concurrent?: number;
            sleepMs?: number;
            callback?: unknown;
            promiseFlavor?: 'PromiseAll' | 'PromiseAllSettled';
            logMe?: boolean;
        }
    ): Promise<unknown>;
}
