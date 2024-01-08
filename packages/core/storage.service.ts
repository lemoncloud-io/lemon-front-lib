export abstract class StorageService {
    storage: Storage;
    abstract setItem(key: string, value: any): void;
    abstract getItem(key: string): string;
    abstract removeItem(key: string): void;
}

let dataMemory: object = {};
class MemoryStorage implements Storage {
    [name: string]: any;
    readonly length: number;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    key(index: number): string | null {
        return undefined;
    }

    setItem(key: string, value: string) {
        dataMemory[key] = value;
        return dataMemory[key];
    }

    getItem(key: string) {
        return Object.prototype.hasOwnProperty.call(dataMemory, key) ? dataMemory[key] : '';
    }

    removeItem(key: string) {
        return delete dataMemory[key];
    }

    clear() {
        dataMemory = {};
        return dataMemory;
    }
}

export class LocalStorageService implements StorageService {
    storage: Storage;

    constructor() {
        try {
            this.storage = window.localStorage;
            this.storage.setItem(`.test-value`, 'test');
            this.storage.removeItem(`.test-value`);
        } catch (exception) {
            this.storage = new MemoryStorage();
        }
    }

    setItem(key: string, value: string) {
        this.storage.setItem(key, value);
    }

    getItem(key: string): string {
        return this.storage.getItem(key);
    }

    removeItem(key: string) {
        this.storage.removeItem(key);
    }
}
