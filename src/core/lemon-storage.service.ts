import { Cloud, LemonCredentials, LemonKMS, LemonOAuthTokenResult, LocalStorageService } from '../helper';

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
        'hostKey',
    ];
    private prefix: string;
    private storageService: Storage;

    constructor(
        private project: string = 'lemon',
        private storage: Storage = new LocalStorageService()
    ) {
        this.prefix = `@${project}`;
        this.storageService = storage;
    }

    updatePrefix(prefix: string) {
        this.prefix = `@${prefix}`;
    }

    async setItem(key: string, value: string) {
        return await this.storageService.setItem(`${this.prefix}.${key}`, value);
    }

    async getItem(key: string) {
        return await this.storageService.getItem(`${this.prefix}.${key}`);
    }

    async getAllItems() {
        return await this.credentialItemList.reduce(async (promise, item) => {
            const tmpResult: { [key: string]: string } = await promise.then();
            tmpResult[`${this.prefix}.${item}`] = await this.storageService.getItem(`${this.prefix}.${item}`);
            return Promise.resolve(tmpResult);
        }, Promise.resolve({}));
    }

    async hasCachedToken(): Promise<boolean> {
        const expiredTime = await this.storageService.getItem(`${this.prefix}.expiredTime`);

        // AWS
        const accessKeyId = await this.storageService.getItem(`${this.prefix}.accessKeyId`);
        const secretKey = await this.storageService.getItem(`${this.prefix}.secretKey`);

        // Azure
        const identityToken = await this.storageService.getItem(`${this.prefix}.identityToken`);
        const accessToken = await this.storageService.getItem(`${this.prefix}.accessToken`);
        const hostKey = await this.storageService.getItem(`${this.prefix}.hostKey`);

        const hasAwsToken = accessKeyId !== null && secretKey !== null && expiredTime !== null;
        const hasAzureToken =
            identityToken !== null && accessToken !== null && hostKey !== null && expiredTime !== null;
        return hasAwsToken || hasAzureToken;
    }

    async shouldRefreshToken(): Promise<boolean> {
        const expiredTime = +(await this.storageService.getItem(`${this.prefix}.expiredTime`));
        const now = new Date().getTime();
        return now >= expiredTime;
    }

    async getCachedCredentialItems(): Promise<LemonCredentials> {
        const AccessKeyId = await this.storageService.getItem(`${this.prefix}.accessKeyId`);
        const SecretKey = await this.storageService.getItem(`${this.prefix}.secretKey`);
        const SessionToken = await this.storageService.getItem(`${this.prefix}.sessionToken`);
        return { AccessKeyId, SecretKey, SessionToken } as LemonCredentials;
    }

    async getCachedLemonOAuthToken(cloud: Cloud): Promise<LemonOAuthTokenResult> {
        const result: any = await this.credentialItemList.reduce(async (promise, item) => {
            const tmpResult: { [key: string]: string } = await promise.then();
            tmpResult[item] = await this.storageService.getItem(`${this.prefix}.${item}`);
            return Promise.resolve(tmpResult);
        }, Promise.resolve({}));

        if (cloud === 'aws') {
            const AccessKeyId = await this.storageService.getItem(`${this.prefix}.accessKeyId`);
            const SecretKey = await this.storageService.getItem(`${this.prefix}.secretKey`);
            const SessionToken = await this.storageService.getItem(`${this.prefix}.sessionToken`);
            result.credential = { AccessKeyId, SecretKey, SessionToken };

            delete result.accessKeyId;
            delete result.secretKey;
            delete result.sessionToken;
            delete result.expiredTime;
        }

        if (cloud === 'azure') {
            const HostKey = await this.storageService.getItem(`${this.prefix}.hostKey`);
            result.credential = { HostKey };

            delete result.hostKey;
            delete result.expiredTime;
        }

        return result;
    }

    /**
     * Required Azure keys: accountId, identityToken
     * @param token
     * @returns
     */
    async saveLemonOAuthToken(token: LemonOAuthTokenResult, cloud: Cloud): Promise<void> {
        const { accountId, authId, credential, identityId, identityPoolId, identityToken, accessToken } = token;
        const { AccessKeyId, SecretKey, SessionToken, hostKey } = credential;

        // save items...
        this.storageService.setItem(`${this.prefix}.accountId`, accountId || '');
        this.storageService.setItem(`${this.prefix}.authId`, authId || '');
        this.storageService.setItem(`${this.prefix}.identityId`, identityId || '');
        this.storageService.setItem(`${this.prefix}.identityToken`, identityToken || '');

        if (cloud === 'aws') {
            this.storageService.setItem(`${this.prefix}.identityPoolId`, identityPoolId || '');
            this.storageService.setItem(`${this.prefix}.accessKeyId`, AccessKeyId || '');
            this.storageService.setItem(`${this.prefix}.secretKey`, SecretKey || '');
            this.storageService.setItem(`${this.prefix}.sessionToken`, SessionToken || '');
        }

        if (cloud === 'azure') {
            this.storageService.setItem(`${this.prefix}.hostKey`, hostKey || '');
            this.storageService.setItem(`${this.prefix}.accessToken`, accessToken || '');
        }

        // set expired time
        const TIME_DELAY = 0.5; // 0.5 = 30minutes, 1 = 1hour
        const expiredTime = new Date().getTime() + TIME_DELAY * 60 * 60 * 1000; // 30 minutes
        this.storageService.setItem(`${this.prefix}.expiredTime`, expiredTime.toString());

        return;
    }

    async clearLemonOAuthToken(): Promise<void> {
        await Promise.all(
            this.credentialItemList.map(item => this.storageService.removeItem(`${this.prefix}.${item}`))
        );
        return;
    }

    async saveKMS(kms: LemonKMS): Promise<void> {
        const kmsArn = kms.arn;

        this.storageService.setItem(`${this.prefix}.kmsArn`, kmsArn || '');

        return;
    }
}
