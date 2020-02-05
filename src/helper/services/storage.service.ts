export class LocalStorageService {

    public prefix: string;
    private storage: any;

    constructor(prefix: string = 'lemon') {
        this.prefix = prefix;

        try {
            this.storage = window.localStorage;
            this.storage.setItem(`${this.prefix}.test-value`, 1);
            this.storage.removeItem(`${this.prefix}.test-value`);
        } catch (exception) {
            this.storage = new MemoryStorage();
        }
    }

    public setItem(key: string, value: string) {
        this.storage.setItem(`${this.prefix}.${key}`, value);
    }

    public getItem(key: string) {
        return this.storage.getItem(`${this.prefix}.${key}`);
    }

    public removeItem(key: string) {
        this.storage.removeItem(`${this}.${key}`);
    }
}

let dataMemory: any = {};

class MemoryStorage {

    constructor() {}

    public setItem(key: string, value: string) {
        dataMemory[key] = value;
        return dataMemory[key];
    }

    public getItem(key: string) {
        return Object.prototype.hasOwnProperty.call(dataMemory, key) ? dataMemory[key] : undefined;
    }

    public removeItem(key: string) {
        return delete dataMemory[key];
    }

    public clear() {
        dataMemory = {};
        return dataMemory;
    }
}

