import * as AWS from 'aws-sdk/global';
import { Credentials } from 'aws-sdk/lib/credentials';
import { RequiredHttpParameters, SignedHttpService } from '../helper/services/signed-http.service';
import { LemonCredentials, LemonOAuthTokenResult, LemonStorageService } from '../helper';
import { LemonRefreshTokenResult } from '../helper/types/lemon-oauth-token.type';

export class IdentityService {

    private credentials: Credentials | null = null;
    private lemonStorage: LemonStorageService;
    private oauthURL: string;

    constructor(oauthURL: string) {
        this.oauthURL = oauthURL;
        this.lemonStorage = new LemonStorageService();

        this.checkCachedToken()
            .then(result => {
                console.log(result);
            })
            .catch(err => {
                console.log(err);
                this.lemonStorage.clearLemonOAuthToken();
            });
    }

    public buildCredentialsByToken(token: LemonOAuthTokenResult): void {
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

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        return this.getCredentials().then(() => {
            const httpService = new SignedHttpService();
            return httpService.request(endpoint, objParams);
        });
    }

    public getCredentials(): Promise<AWS.Credentials | null> {
        if (this.hasNoCredentials()) {
            return new Promise((resolve) => resolve(null));
        }

        if (!this.lemonStorage.hasCachedToken()) {
            return new Promise((resolve) => resolve(null));
        }

        if (this.lemonStorage.shouldRefreshToken()) {
            return new Promise(resolve => {
                this.refreshCachedToken()
                    .then(() => this.getCurrentCredentials())
                    .catch(() => resolve(null));
            });
        }

        const credentials = (<AWS.Credentials> AWS.config.credentials);
        const shouldRefresh = credentials.needsRefresh();
        if (shouldRefresh) {
            return credentials.refreshPromise().then(() => this.getCurrentCredentials());
        }
        return this.getCurrentCredentials();
    }

    public isAuthenticated(): Promise<boolean> {
        if (this.hasNoCredentials()) {
            return new Promise(resolve => resolve(false));
        }

        if (!this.lemonStorage.hasCachedToken()) {
            return new Promise((resolve) => resolve(false));
        }

        if (this.lemonStorage.shouldRefreshToken()) {
            return new Promise(resolve => {
                this.refreshCachedToken()
                    .then(() => resolve(true))
                    .catch(() => resolve(false));
            });
        }

        return new Promise(resolve => {
            (<AWS.Credentials> AWS.config.credentials).get((error) => {
                const isAuthenticated = error ? false : true;
                resolve(isAuthenticated);
            });
        });
    }

    public logout(): Promise<boolean> {
        return new Promise((resolve) => {
            this.credentials = null;
            AWS.config.credentials = null;
            // remove data from localStorage
            this.lemonStorage.clearLemonOAuthToken();
            resolve(true)
        })
    }

    private checkCachedToken(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.lemonStorage.hasCachedToken()) {
                this.lemonStorage.clearLemonOAuthToken();
                resolve('cleared!');
            }

            if (this.lemonStorage.shouldRefreshToken()) {
                this.refreshCachedToken()
                    .then(() => resolve('refreshed!'))
                    .catch(err => reject(err));
            }

            // build AWS token
            const credential = this.lemonStorage.getCachedCredentialItems();
            this.createAWSCredentials(credential);
            resolve('build credential!');
        });
    }

    private refreshCachedToken() {
        const originToken: LemonOAuthTokenResult = this.lemonStorage.getCachedLemonOAuthToken();
        const { authId: originAuthId } = originToken;

        // TODO: create signature
        const signature = '';
        const current = new Date().toISOString();

        // $ http POST :8086/oauth/auth001/refresh 'current=2020-02-03T08:02:37.468Z' 'signature='
        return this.requestWithSign('POST', this.oauthURL, `/oauth/${originAuthId}/refresh`, {}, { current, signature })
            .then((result: LemonRefreshTokenResult) => {
                console.log('refresh: ', result);
                const { identityPoolId, identityToken } = originToken;
                const { authId, accountId, identityId, credential } = result;
                const refreshToken: LemonOAuthTokenResult = { authId, accountId, identityPoolId, identityToken, identityId, credential };
                this.lemonStorage.saveLemonOAuthToken(refreshToken);
                this.createAWSCredentials(credential);
                return result;
            });
    }

    private createAWSCredentials(credential: LemonCredentials) {
        const { AccessKeyId, SecretKey, SessionToken } = credential;
        this.credentials = new AWS.Credentials(AccessKeyId, SecretKey, SessionToken);
        AWS.config.credentials = this.credentials;
    }

    private getCurrentCredentials(): Promise<AWS.Credentials> {
        return new Promise((resolve, reject) => {
            const credentials = (<AWS.Credentials> AWS.config.credentials);
            credentials.get((error) => {
                if (error) {
                    reject(error);
                }
                this.credentials = <AWS.Credentials> AWS.config.credentials;
                resolve(this.credentials);
            });
        });
    }

    private hasNoCredentials(): boolean {
        return this.credentials === null && !this.lemonStorage.hasCachedToken();
    }
}
