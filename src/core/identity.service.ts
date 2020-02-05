import * as AWS from 'aws-sdk/global';

// services
import { LemonStorageService } from './lemon-storage.service';
import { UtilsService } from '../helper/services/utils.service';
import { SignedHttpService } from '../helper/services/signed-http.service';

// types
import { RequiredHttpParameters } from '../helper/services/signed-http.service';
import { LemonCredentials, LemonOAuthTokenResult, LemonRefreshTokenResult } from '../helper';

export class IdentityService {

    private oauthURL: string = 'http://localhost:8086';

    private lemonStorage: LemonStorageService;
    private utilsService: UtilsService;

    constructor(oauthURL?: string) {
        if (oauthURL) {
            this.oauthURL = oauthURL;
        }
        this.lemonStorage = new LemonStorageService();
        this.utilsService = new UtilsService();

        this.checkCachedToken()
            .then(result => {
                console.log('checkCachedToken: ', result);
            })
            .catch(err => {
                console.log('checkCachedToken: ' , err);
                this.lemonStorage.clearLemonOAuthToken();
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

    requestWithSign(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
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
        } else {
            return new Promise(resolve => {
                (<AWS.Credentials> AWS.config.credentials).get(error => {
                    const isAuthenticated = error ? false : true;
                    resolve(isAuthenticated);
                });
            });
        }
    }

    logout(): Promise<boolean> {
        return new Promise(resolve => {
            AWS.config.credentials = null;
            // remove data from localStorage
            this.lemonStorage.clearLemonOAuthToken();
            resolve(true);
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
            } else {
                // build AWS token
                const credential = this.lemonStorage.getCachedCredentialItems();
                this.createAWSCredentials(credential);
                resolve('build credential!');
            }
        });
    }

    private refreshCachedToken() {
        const originToken: LemonOAuthTokenResult = this.lemonStorage.getCachedLemonOAuthToken();
        const { authId: originAuthId, accountId, identityId, identityToken, identityPoolId } = originToken;

        const current = new Date().toISOString();
        const signature = this.utilsService.calcSignature(originAuthId, accountId, identityId, identityToken, current);

        // $ http POST :8086/oauth/auth001/refresh 'current=2020-02-03T08:02:37.468Z' 'signature='
        return this.requestWithSign('POST', this.oauthURL, `/oauth/${originAuthId}/refresh`, {}, { current, signature })
            .then((result: LemonRefreshTokenResult) => {
                console.log('LemonRefreshToken result: ', result);
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
                    console.log('Error on getCurrentCredentials: ', error);
                    reject(null);
                }
                const awsCredentials = <AWS.Credentials> AWS.config.credentials;
                resolve(awsCredentials);
            });
        });
    }
}
