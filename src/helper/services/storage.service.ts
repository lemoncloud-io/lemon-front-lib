import { LemonCredentials, LemonOAuthTokenResult } from '../types/lemon-oauth-token.type';

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

export class LemonStorageService extends LocalStorageService {

    private credentialItemList = [
        'accountId', 'authId', 'identityId',
        'identityPoolId', 'identityToken', 'accessKeyId',
        'secretKey', 'sessionToken', 'expiredTime'
    ];

    constructor() {
        super('LEMON_CREDENTIAL');
    }

    public hasCachedToken(): boolean {
        const accessKeyId = this.getItem('accessKeyId');
        const secretKey = this.getItem('secretKey');
        const expiredTime = this.getItem('expiredTime');

        const hasToken = accessKeyId !== null && secretKey !== null && expiredTime !== null;
        return hasToken ? true : false;
    }

    public shouldRefreshToken(): boolean {
        const expiredTime = this.getItem('expiredTime');
        const now = new Date().getTime().toString();

        if (now > expiredTime) {
            return false;
        }
        return true;
    }

    public hasValidToken() {
        const hasCachedToken = this.hasCachedToken();
        if (!hasCachedToken) {
            return false;
        }
        const shouldRefreshToken = this.shouldRefreshToken();
        if (shouldRefreshToken) {
            return false;
        }
        return true;
    }

    public getCachedCredentialItems(): LemonCredentials {
        const AccessKeyId = this.getItem('accessKeyId');
        const SecretKey = this.getItem('secretKey');
        const SessionToken = this.getItem('sessionToken');
        return { AccessKeyId, SecretKey, SessionToken };
    }

    public getCachedLemonOAuthToken(): LemonOAuthTokenResult {
        const result: any = {};
        this.credentialItemList.map(item => {
           result[item] = this.getItem(item);
        });

        const AccessKeyId = this.getItem('accessKeyId');
        const SecretKey = this.getItem('secretKey');
        const SessionToken = this.getItem('sessionToken');
        result.credential = { AccessKeyId, SecretKey, SessionToken };

        delete result.accessKeyId;
        delete result.secretKey;
        delete result.sessionToken;
        delete result.expiredTime;

        return result;
    }

    public saveLemonOAuthToken(token: LemonOAuthTokenResult) {
        const { accountId, authId, credential, identityId, identityPoolId, identityToken } = token;
        const { AccessKeyId, SecretKey, SessionToken } = credential;

        // save items...
        this.setItem('accountId', accountId);
        this.setItem('authId', authId);
        this.setItem('identityId', identityId);
        this.setItem('identityPoolId', identityPoolId);
        this.setItem('identityToken', identityToken);

        // credential for AWS
        this.setItem('accessKeyId', AccessKeyId);
        this.setItem('secretKey', SecretKey);
        this.setItem('sessionToken', SessionToken);

        const expiredTime = new Date().getTime() + (1 * 60 * 60 * 1000); // 1 hours
        this.setItem('expiredTime', expiredTime.toString());

        return;
    }

    public clearLemonOAuthToken() {
        this.credentialItemList.map(item => this.removeItem(`${item}`));
        return;
    }
}

// TODO: move below to other path
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

