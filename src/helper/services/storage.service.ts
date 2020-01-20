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

    public isValidToken() {
        const { cachedAccessKeyId, cachedSecretKey } = this.getCachedCredentialItems();
        if (cachedAccessKeyId === null || cachedSecretKey === null) {
            return false;
        }
        const expired = this.getItem('expiredTime');
        if (!expired) {
            return false;
        }
        const now = new Date().getTime().toString();
        if (now >= expired) {
            return false;
        }
        return true;
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

        const expiredTime = new Date().getTime() + (24 * 60 * 60 * 1000); // +24hours
        this.setItem('expiredTime', expiredTime.toString());
    }

    public removeCredentialItems() {
        this.removeItem('accessKeyId');
        this.removeItem('secretKey');
        this.removeItem('sessionToken');
        this.removeItem('expiredTime');
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

