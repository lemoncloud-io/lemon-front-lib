
export class StorageService {

    private storage: any;
    private static PREFIX = 'LEMON_CREDENTIAL';

    constructor() {
        // TODO: add memory storage
        try {
            this.storage = window.localStorage;
            this.storage.setItem(`${StorageService.PREFIX}.test-value`, 1);
            this.storage.removeItem(`${StorageService.PREFIX}.test-value`);
        } catch (exception) {
            this.storage = new MemoryStorage();
        }
    }

    public getCachedCredentialItems() {
        const cachedAccessKeyId = this.getItem('accessKeyId');
        const cachedSecretKey = this.getItem('secretKey');
        const cachedSessionToken = this.getItem('sessionToken');
        return { cachedAccessKeyId, cachedSecretKey, cachedSessionToken };
    }

    public setCredentialItems(credentials: { accessKeyId: string, secretKey: string, sessionToken: string }) {
        const { accessKeyId, secretKey, sessionToken } = credentials;
        this.setItem('accessKeyId', accessKeyId);
        this.setItem('secretKey', secretKey);
        this.setItem('sessionToken', sessionToken);
    }

    public removeCredentialItems() {
        this.removeItem('accessKeyId');
        this.removeItem('secretKey');
        this.removeItem('sessionToken');
    }

    private setItem(key: string, value: string) {
        this.storage.setItem(`${StorageService.PREFIX}.${key}`, value);
    }

    private getItem(key: string) {
        return this.storage.getItem(`${StorageService.PREFIX}.${key}`);
    }

    private removeItem(key: string) {
        this.storage.removeItem(`${StorageService.PREFIX}.${key}`);
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

