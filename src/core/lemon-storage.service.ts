import { LemonCredentials, LemonOAuthTokenResult, LocalStorageService } from '../helper';

export interface Storage {
    getItem(key: string, ...params: any): any;
    setItem(key: string, value: string, ...params: any): any;
    removeItem(key: string, ...params: any): any;
}

export class LemonStorageService {
    private credentialItemList = [
        'accountId',
        'authId',
        'identityId',
        'identityPoolId',
        'identityToken',
        'accessKeyId',
        'secretKey',
        'sessionToken',
        'expiredTime',
    ];
    private prefix: string;
    private storageService: Storage;

    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    constructor(private project: string = 'lemon', private storage: Storage = new LocalStorageService()) {
        this.prefix = `@${project.toUpperCase()}`;
        this.storageService = storage;
    }

    async setItem(key: string, value: string) {
        return await this.storageService.setItem(`${this.prefix}.${key}`, value);
    }

    async getItem(key: string) {
        return await this.storageService.getItem(`${this.prefix}.${key}`);
    }

    async getAllItems() {
        return await this.credentialItemList.reduce(async (promise, item) => {
            let tmpResult: { [key: string]: string } = await promise.then();
            tmpResult[`${this.prefix}.${item}`] = await this.storageService.getItem(`${this.prefix}.${item}`);
            return Promise.resolve(tmpResult);
        }, Promise.resolve({}));
    }

    async hasCachedToken(): Promise<boolean> {
        const accessKeyId = await this.storageService.getItem(`${this.prefix}.accessKeyId`);
        const secretKey = await this.storageService.getItem(`${this.prefix}.secretKey`);
        const expiredTime = await this.storageService.getItem(`${this.prefix}.expiredTime`);

        const hasToken = accessKeyId !== null && secretKey !== null && expiredTime !== null;
        return hasToken;
    }

    async shouldRefreshToken(): Promise<boolean> {
        const expiredTime = await this.storageService.getItem(`${this.prefix}.expiredTime`);
        const now = new Date().getTime().toString();

        return now >= expiredTime;
    }

    async getCachedCredentialItems(): Promise<LemonCredentials> {
        const AccessKeyId = await this.storageService.getItem(`${this.prefix}.accessKeyId`);
        const SecretKey = await this.storageService.getItem(`${this.prefix}.secretKey`);
        const SessionToken = await this.storageService.getItem(`${this.prefix}.sessionToken`);
        // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
        return { AccessKeyId, SecretKey, SessionToken } as LemonCredentials;
    }

    async getCachedLemonOAuthToken(): Promise<LemonOAuthTokenResult> {
        const result: any = await this.credentialItemList.reduce(async (promise, item) => {
            let tmpResult: { [key: string]: string } = await promise.then();
            tmpResult[item] = await this.storageService.getItem(`${this.prefix}.${item}`);
            return Promise.resolve(tmpResult);
        }, Promise.resolve({}));

        const AccessKeyId = await this.storageService.getItem(`${this.prefix}.accessKeyId`);
        const SecretKey = await this.storageService.getItem(`${this.prefix}.secretKey`);
        const SessionToken = await this.storageService.getItem(`${this.prefix}.sessionToken`);
        result.credential = { AccessKeyId, SecretKey, SessionToken };

        delete result.accessKeyId;
        delete result.secretKey;
        delete result.sessionToken;
        delete result.expiredTime;

        return result;
    }

    async saveLemonOAuthToken(token: LemonOAuthTokenResult): Promise<void> {
        const { accountId, authId, credential, identityId, identityPoolId, identityToken } = token;
        const { AccessKeyId, SecretKey, SessionToken } = credential;

        // save items...
        this.storageService.setItem(`${this.prefix}.accountId`, accountId || '');
        this.storageService.setItem(`${this.prefix}.authId`, authId || '');
        this.storageService.setItem(`${this.prefix}.identityId`, identityId || '');
        this.storageService.setItem(`${this.prefix}.identityPoolId`, identityPoolId || '');
        this.storageService.setItem(`${this.prefix}.identityToken`, identityToken || '');

        // credential for AWS
        this.storageService.setItem(`${this.prefix}.accessKeyId`, AccessKeyId || '');
        this.storageService.setItem(`${this.prefix}.secretKey`, SecretKey || '');
        this.storageService.setItem(`${this.prefix}.sessionToken`, SessionToken || '');

        // set expired time
        const TIME_DELAY = 0.5; // 0.5 = 30minutes, 1 = 1hour
        const expiredTime = new Date().getTime() + TIME_DELAY * 60 * 60 * 1000; // 30 minutes
        this.storageService.setItem(`${this.prefix}.expiredTime`, expiredTime.toString());

        return;
    }

    async clearLemonOAuthToken(): Promise<void> {
        await Promise.all(
            this.credentialItemList.map(item => this.storageService.removeItem(`${this.prefix}.${item}`)),
        );
        return;
    }
}
