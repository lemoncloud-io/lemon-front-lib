import * as AWS from 'aws-sdk/global';

// services
import { LemonStorageService } from './lemon-storage.service';
import { UtilsService } from '../helper/services/utils.service';
import { SignedHttpService } from '../helper/services/signed-http.service';

// types
import { SignaturePayload } from '../helper/services/utils.service';
import { RequiredHttpParameters } from '../helper/services/signed-http.service';
import {
    LemonCredentials,
    LemonOAuthTokenResult,
    LemonOptions,
    LemonRefreshTokenResult,
    LoggerService,
} from '../helper';
import { AxiosRequestConfig } from 'axios';

export class IdentityService {

    private oauthURL: string;

    private readonly lemonStorage: LemonStorageService;
    private readonly logger: LoggerService;
    private readonly utils: UtilsService;

    constructor(options: LemonOptions) {
        this.logger = new LoggerService('IDS');
        this.logger.log('initialize IdentityService(IDS)');

        const { oAuthEndpoint } = options;
        this.oauthURL = oAuthEndpoint;
        this.lemonStorage = new LemonStorageService();
        this.utils = new UtilsService();

        this.checkCachedToken()
            .then(result => this.logger.log('checkCachedToken: ', result))
            .catch(err => this.logger.log('checkCachedToken: ', err));
    }

    buildCredentialsByToken(token: LemonOAuthTokenResult): void {
        this.logger.log('buildCredentialsByToken()...');

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

    request(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any, axiosConfig?: AxiosRequestConfig): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        const httpService = new SignedHttpService();
        return httpService.request(endpoint, objParams, axiosConfig);
    }

    requestWithCredentials(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        return this.getCredentials().then(() => this.request(method, endpoint, path, params, body));
    }

    getCredentials(): Promise<AWS.Credentials | null> {
        if (!this.lemonStorage.hasCachedToken()) {
            this.logger.info('has no cached token!');
            return new Promise(resolve => resolve(null));
        }

        if (this.lemonStorage.shouldRefreshToken()) {
            this.logger.info('should refresh token!');
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
            this.logger.info('return isAuthenticated after refresh token');
            return new Promise(resolve => {
                this.refreshCachedToken()
                    .then(() => resolve(true))
                    .catch(() => resolve(false));
            });
        }

        return new Promise(resolve => {
            (<AWS.Credentials> AWS.config.credentials).get(error => {
                if (error) {
                    this.logger.error('get AWS.config.credentials error: ', error);
                }
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

    private checkCachedToken(): Promise<string> {
        this.logger.log('checkCachedToken()...');
        return new Promise((resolve, reject) => {
            if (!this.lemonStorage.hasCachedToken()) {
                return reject('has no token!');
            }

            if (this.lemonStorage.shouldRefreshToken()) {
                return this.refreshCachedToken()
                    .then(() => resolve('refresh token!'))
                    .catch(err => {
                        this.logger.error('refreshCachedToken(): ', err);
                        this.logger.log('clear Storage...');
                        this.lemonStorage.clearLemonOAuthToken();
                        reject(err);
                    });
            } else {
                // Build AWS credential without refresh token
                const credential = this.lemonStorage.getCachedCredentialItems();
                this.createAWSCredentials(credential);
                return resolve('build credentials!');
            }
        });
    }


    private refreshCachedToken() {
        this.logger.log('refreshCachedToken()...');
        const originToken: LemonOAuthTokenResult = this.lemonStorage.getCachedLemonOAuthToken();
        const { authId: originAuthId, accountId, identityId, identityToken, identityPoolId } = originToken;

        const payload: SignaturePayload = { authId: originAuthId, accountId, identityId, identityToken };
        const current = new Date().toISOString();
        const signature = this.utils.calcSignature(payload, current);

        //! lemon-accounts-api
        //! $ http POST :8086/oauth/auth001/refresh 'current=2020-02-03T08:02:37.468Z' 'signature='
        //! INFO: requestWithCredentials()의 경우, 내부에서 getCredential() 호출하기 때문에 recursive 발생함
        this.logger.log('request refresh to OAUTH API');
        return this.request('POST', this.oauthURL, `/oauth/${originAuthId}/refresh`, {}, { current, signature })
            .then((result: LemonRefreshTokenResult) => {
                const { authId, accountId, identityId, credential } = result;
                const refreshToken: LemonOAuthTokenResult = { authId, accountId, identityPoolId, identityToken, identityId, credential };
                this.lemonStorage.saveLemonOAuthToken(refreshToken);
                this.logger.log('create new credentials after refresh token');
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
                    this.logger.error('Error on getCurrentCredentials: ', error);
                    reject(null);
                }
                this.logger.info('success to get AWS credentials');
                const awsCredentials = <AWS.Credentials> AWS.config.credentials;
                resolve(awsCredentials);
            });
        });
    }
}
