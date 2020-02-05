import { LemonCredentials, LemonOAuthTokenResult } from '../helper/types/lemon-oauth-token.type';
import { LocalStorageService } from '../helper/services/storage.service';

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

        const TIME_DELAY = 0.5; // 0.5 = 30minutes, 1 = 1hour
        const expiredTime = new Date().getTime() + (TIME_DELAY * 60 * 60 * 1000); // 30 minutes
        this.setItem('expiredTime', expiredTime.toString());

        return;
    }

    public clearLemonOAuthToken() {
        this.credentialItemList.map(item => this.removeItem(`${item}`));
        return;
    }
}
