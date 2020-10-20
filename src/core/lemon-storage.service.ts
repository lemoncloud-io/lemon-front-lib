import { LemonCredentials, LemonOAuthTokenResult, LocalStorageService } from '../helper';

export class LemonStorageService extends LocalStorageService {

    private credentialItemList = [
        'accountId', 'authId', 'identityId',
        'identityPoolId', 'identityToken', 'accessKeyId',
        'secretKey', 'sessionToken', 'expiredTime'
    ];

    constructor(private project: string = 'lemon') {
        super(`${project}_LEMON_CREDENTIAL`);
    }

    hasCachedToken(): boolean {
        const accessKeyId = this.getItem('accessKeyId');
        const secretKey = this.getItem('secretKey');
        const expiredTime = this.getItem('expiredTime');

        const hasToken = accessKeyId !== null && secretKey !== null && expiredTime !== null;
        return hasToken;
    }

    shouldRefreshToken(): boolean {
        const expiredTime = this.getItem('expiredTime');
        const now = new Date().getTime().toString();

        return now >= expiredTime;
    }

    getCachedCredentialItems(): LemonCredentials {
        const AccessKeyId = this.getItem('accessKeyId');
        const SecretKey = this.getItem('secretKey');
        const SessionToken = this.getItem('sessionToken');
        return { AccessKeyId, SecretKey, SessionToken };
    }

    getCachedLemonOAuthToken(): LemonOAuthTokenResult {
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

    saveLemonOAuthToken(token: LemonOAuthTokenResult): void {
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

        // set expired time
        const TIME_DELAY = 0.5; // 0.5 = 30minutes, 1 = 1hour
        const expiredTime = new Date().getTime() + (TIME_DELAY * 60 * 60 * 1000); // 30 minutes
        this.setItem('expiredTime', expiredTime.toString());

        return;
    }

    clearLemonOAuthToken(): void {
        this.credentialItemList.map(item => this.removeItem(`${item}`));
        return;
    }
}
