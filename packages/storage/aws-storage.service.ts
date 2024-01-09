import { StorageService } from '../types/storage.service';
import { LemonCredentials, LemonOAuthTokenResult } from '../types';

export class AWSStorageService extends StorageService {
    constructor(project: string) {
        super(project);
        this.credentialItemList = [
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
    }

    async hasCachedToken(): Promise<boolean> {
        const accessKeyId = await this.storage.getItem(`${this.project}.accessKeyId`);
        const secretKey = await this.storage.getItem(`${this.project}.secretKey`);
        const expiredTime = await this.storage.getItem(`${this.project}.expiredTime`);

        return accessKeyId !== null && secretKey !== null && expiredTime !== null;
    }

    async shouldRefreshToken(): Promise<boolean> {
        const expiredTime = +(await this.storage.getItem(`${this.project}.expiredTime`));
        const now = new Date().getTime();
        return now >= expiredTime;
    }

    async getCachedCredentialItems(): Promise<LemonCredentials> {
        const AccessKeyId = await this.storage.getItem(`${this.project}.accessKeyId`);
        const SecretKey = await this.storage.getItem(`${this.project}.secretKey`);
        const SessionToken = await this.storage.getItem(`${this.project}.sessionToken`);
        return { AccessKeyId, SecretKey, SessionToken } as LemonCredentials;
    }

    async getCachedLemonOAuthToken(): Promise<LemonOAuthTokenResult> {
        const result: any = await this.credentialItemList.reduce(async (promise, item) => {
            const tmpResult: { [key: string]: string } = await promise.then();
            tmpResult[item] = await this.storage.getItem(`${this.project}.${item}`);
            return Promise.resolve(tmpResult);
        }, Promise.resolve({}));

        const AccessKeyId = await this.storage.getItem(`${this.project}.accessKeyId`);
        const SecretKey = await this.storage.getItem(`${this.project}.secretKey`);
        const SessionToken = await this.storage.getItem(`${this.project}.sessionToken`);
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
        await this.storage.setItem(`${this.project}.accountId`, accountId || '');
        await this.storage.setItem(`${this.project}.authId`, authId || '');
        await this.storage.setItem(`${this.project}.identityId`, identityId || '');
        await this.storage.setItem(`${this.project}.identityPoolId`, identityPoolId || '');
        await this.storage.setItem(`${this.project}.identityToken`, identityToken || '');

        // credential for AWS
        await this.storage.setItem(`${this.project}.accessKeyId`, AccessKeyId || '');
        await this.storage.setItem(`${this.project}.secretKey`, SecretKey || '');
        await this.storage.setItem(`${this.project}.sessionToken`, SessionToken || '');

        // set expired time
        const TIME_DELAY = 0.5; // 0.5 = 30minutes, 1 = 1hour
        const expiredTime = new Date().getTime() + TIME_DELAY * 60 * 60 * 1000; // 30 minutes
        await this.storage.setItem(`${this.project}.expiredTime`, expiredTime.toString());
        return;
    }

    async clearLemonOAuthToken(): Promise<void> {
        await Promise.all(this.credentialItemList.map(item => this.storage.removeItem(`${this.project}.${item}`)));
        return;
    }
}
