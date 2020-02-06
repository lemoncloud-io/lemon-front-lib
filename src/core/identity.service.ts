import * as AWS from 'aws-sdk/global';

// services
import { LemonStorageService } from './lemon-storage.service';
import { UtilsService } from '../helper/services/utils.service';
import { SignedHttpService } from '../helper/services/signed-http.service';

// types
import { SignaturePayload } from '../helper/services/utils.service';
import { RequiredHttpParameters } from '../helper/services/signed-http.service';
import { LemonCredentials, LemonOAuthTokenResult, LemonRefreshTokenResult } from '../helper';

export class IdentityService {

    private oauthURL: string = 'http://localhost:8086';

    private lemonStorage: LemonStorageService;
    private utils: UtilsService;

    constructor(oauthURL?: string) {
        if (oauthURL) {
            this.oauthURL = oauthURL;
        }
        this.lemonStorage = new LemonStorageService();
        this.utils= new UtilsService();

        this.checkCachedToken()
            .then(result => {
                console.info('checkCachedToken: ', result);
            })
            .catch(err => {
                this.lemonStorage.clearLemonOAuthToken();
                console.log('checkCachedToken: ', err);
            });
    }

    buildCredentialsByToken(token: LemonOAuthTokenResult): void {
        const { credential } = token;
        const { AccessKeyId, SecretKey } = credential;
        if (!AccessKeyId) {
            throw new Error('.AccessKeyId (string) is required!');
        }
        if (!SecretKey) {
            throw new Error('.SecretKey (string) is required!');
        }

        // STEP 1. Save to localStorage
        this.lemonStorage.saveLemonOAuthToken(token);
        // STEP 2. Set AWS Credential
        this.createAWSCredentials(credential);
    }

    request(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        const httpService = new SignedHttpService();
        return httpService.request(endpoint, objParams);
    }

    requestWithCredentials(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        return this.getCredentials().then(() => {
            const httpService = new SignedHttpService();
            return httpService.request(endpoint, objParams);
        });
    }

    getCredentials(): Promise<AWS.Credentials | null> {
        if (!this.lemonStorage.hasCachedToken()) {
            return new Promise(resolve => resolve(null));
        }

        if (this.lemonStorage.shouldRefreshToken()) {
            return this.refreshCachedToken().then(() => this.getCurrentCredentials())
        }

        const credentials = (<AWS.Credentials> AWS.config.credentials);
        const shouldRefresh = credentials.needsRefresh();
        if (shouldRefresh) {
            return credentials.refreshPromise().then(() => this.getCurrentCredentials());
        }
        return this.getCurrentCredentials();
    }

    isAuthenticated(): Promise<boolean> {
        if (!this.lemonStorage.hasCachedToken()) {
            return new Promise(resolve => resolve(false));
        }

        if (this.lemonStorage.shouldRefreshToken()) {
            return new Promise(resolve => {
                this.refreshCachedToken()
                    .then(() => resolve(true))
                    .catch(() => resolve(false));
            });
        }

        return new Promise(resolve => {
            (<AWS.Credentials> AWS.config.credentials).get(error => {
                const isAuthenticated = error ? false : true;
                resolve(isAuthenticated);
            });
        });
    }

    logout(): Promise<boolean> {
        return new Promise(resolve => {
            AWS.config.credentials = null;
            this.lemonStorage.clearLemonOAuthToken();
            resolve(true);
        })
    }

    private checkCachedToken(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.lemonStorage.hasCachedToken()) {
                return reject('has no token!');
            }

            if (this.lemonStorage.shouldRefreshToken()) {
                return this.refreshCachedToken()
                    .then(() => resolve('refresh token!'))
                    .catch(err => reject(err));
            }

            // Build AWS credential without refresh token
            const credential = this.lemonStorage.getCachedCredentialItems();
            this.createAWSCredentials(credential);
            return resolve('build credentials!');
        });
    }

    private refreshCachedToken() {
        const originToken: LemonOAuthTokenResult = this.lemonStorage.getCachedLemonOAuthToken();
        const { authId: originAuthId, accountId, identityId, identityToken, identityPoolId } = originToken;

        const payload: SignaturePayload = { authId: originAuthId, accountId, identityId, identityToken };
        const current = new Date().toISOString();
        const signature = this.utils.calcSignature(payload, current);

        //! lemon-accounts-api
        //! $ http POST :8086/oauth/auth001/refresh 'current=2020-02-03T08:02:37.468Z' 'signature='
        //! INFO: requestWithCredentials()의 경우, 내부에서 getCredential() 호출하기 때문에 recursive 발생함
        return this.request('POST', this.oauthURL, `/oauth/${originAuthId}/refresh`, {}, { current, signature })
            .then((result: LemonRefreshTokenResult) => {
                const { authId, accountId, identityId, credential } = result;
                const refreshToken: LemonOAuthTokenResult = { authId, accountId, identityPoolId, identityToken, identityId, credential };
                this.lemonStorage.saveLemonOAuthToken(refreshToken);
                this.createAWSCredentials(credential);
                return result;
            });
    }

    private createAWSCredentials(credential: LemonCredentials) {
        const { AccessKeyId, SecretKey, SessionToken } = credential;
        AWS.config.credentials = new AWS.Credentials(AccessKeyId, SecretKey, SessionToken);
    }

    private getCurrentCredentials(): Promise<AWS.Credentials> {
        return new Promise((resolve, reject) => {
            const credentials = (<AWS.Credentials> AWS.config.credentials);
            credentials.get((error) => {
                if (error) {
                    console.error('Error on getCurrentCredentials: ', error);
                    reject(null);
                }
                const awsCredentials = <AWS.Credentials> AWS.config.credentials;
                resolve(awsCredentials);
            });
        });
    }
}
