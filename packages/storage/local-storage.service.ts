import { GeneralAsyncStorage } from '../types/storage.service';

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

export class LocalStorageService implements GeneralAsyncStorage {
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

    async setItem(key: string, value: string) {
        return await this.storage.setItem(key, value);
    }

    async getItem(key: string): Promise<string> {
        return await this.storage.getItem(key);
    }

    async removeItem(key: string) {
        return await this.storage.removeItem(key);
    }
}
