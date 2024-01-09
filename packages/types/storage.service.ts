import { LocalStorageService } from '../storage/local-storage.service';

export abstract class GeneralAsyncStorage {
    storage: Storage;
    abstract setItem(key: string, value: any): Promise<void>;
    abstract getItem(key: string): Promise<string>;
    abstract removeItem(key: string): Promise<void>;
}

export abstract class StorageService {
    protected project: string;
    protected storage: GeneralAsyncStorage;
    protected credentialItemList: string[];

    protected constructor(project: string, storage: GeneralAsyncStorage = new LocalStorageService()) {
        this.project = `@${project}`;
        this.storage = storage;
    }

    abstract hasCachedToken(): Promise<boolean>;
    abstract shouldRefreshToken(): Promise<boolean>;
    abstract clearLemonOAuthToken(): Promise<void>;

    async setItem(key: string, value: string) {
        return await this.storage.setItem(`${this.project}.${key}`, value);
    }

    async getItem(key: string) {
        return await this.storage.getItem(`${this.project}.${key}`);
    }

    async getAllItems(): Promise<{ [key: string]: string }> {
        return await this.credentialItemList.reduce(async (promise, item) => {
            const tmpResult: { [key: string]: string } = await promise.then();
            tmpResult[`${this.project}.${item}`] = await this.storage.getItem(`${this.project}.${item}`);
            return Promise.resolve(tmpResult);
        }, Promise.resolve({}));
    }

    updateProject(project: string) {
        this.project = `@${project}`;
    }
}
