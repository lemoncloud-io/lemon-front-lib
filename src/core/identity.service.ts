import * as AWS from 'aws-sdk/global';

// services
import { LemonStorageService, Storage } from './lemon-storage.service';
import { UtilsService, SignedHttpService } from '../helper';

// types
import { SignaturePayload, RequiredHttpParameters } from '../helper';
import {
    LemonCredentials,
    LemonOAuthTokenResult,
    LemonOptions,
    LemonRefreshTokenResult,
    LoggerService,
} from '../helper';

export class IdentityService {

    private oauthURL: string;
    private extraHeader: any = {};
    private extraOptions: any = {};

    private readonly lemonStorage: LemonStorageService;
    private readonly logger: LoggerService;
    private readonly utils: UtilsService;

    constructor(options: LemonOptions, storage?: Storage) {
        this.logger = new LoggerService('IDS', options);
        this.logger.log('initialize IdentityService(IDS)');

        this.setExtraData(options);
        const { project } = options;
        this.lemonStorage = new LemonStorageService(project, storage);
        this.utils = new UtilsService();

        this.checkCachedToken()
            .then(result => this.logger.log('checkCachedToken: ', result))
            .catch(err => this.logger.log('checkCachedToken: ', err));
    }

    setOptions(options: LemonOptions) {
        this.setExtraData(options);
    }

    getSavedCredentials(): Promise<{ [key: string]: string }> {
        return this.lemonStorage.getAllItems();
    }

    async buildCredentialsByToken(token: LemonOAuthTokenResult): Promise<void> {
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
        await this.lemonStorage.saveLemonOAuthToken(token);
        // STEP 2. Set AWS Credential
        this.createAWSCredentials(credential);
    }

    request(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        // const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const bodyReq = body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        const options = { customHeader: this.extraHeader, customOptions: this.extraOptions };
        const httpService = new SignedHttpService(options);
        return httpService.request(endpoint, objParams);
    }

    requestWithCredentials(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        return this.getCredentials().then(() => this.request(method, endpoint, path, params, body));
    }

    async getCredentials(): Promise<AWS.Credentials | null> {
        const hasCachedToken = await this.lemonStorage.hasCachedToken();
        if (!hasCachedToken) {
            this.logger.info('has no cached token!');
            return new Promise(resolve => resolve(null));
        }

        const shouldRefreshToken = await this.lemonStorage.shouldRefreshToken();
        if (shouldRefreshToken) {
            this.logger.info('should refresh token!');
            return this.refreshCachedToken().then(() => this.getCurrentCredentials());
        }

        const credentials = AWS.config.credentials as AWS.Credentials;
        const shouldRefresh = credentials.needsRefresh();
        if (shouldRefresh) {
            return credentials.refreshPromise().then(() => this.getCurrentCredentials());
        }
        return this.getCurrentCredentials();
    }

    async isAuthenticated(): Promise<boolean> {
        const hasCachedToken = await this.lemonStorage.hasCachedToken();
        if (!hasCachedToken) {
            return new Promise(resolve => resolve(false));
        }

        const shouldRefreshToken = await this.lemonStorage.shouldRefreshToken();
        if (shouldRefreshToken) {
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
                const isAuthenticated = !error;
                resolve(isAuthenticated);
            });
        });
    }

    logout(): Promise<boolean> {
        AWS.config.credentials = null;
        return this.lemonStorage.clearLemonOAuthToken()
            .then(() => true)
            .catch(() => false);
    }

    private setExtraData(options: LemonOptions) {
        const { oAuthEndpoint, extraHeader, extraOptions } = options;
        this.oauthURL = oAuthEndpoint;
        this.extraHeader = extraHeader ? extraHeader : {};
        this.extraOptions = extraOptions ? extraOptions : {};
    }

    private checkCachedToken(): Promise<string> {
        this.logger.log('checkCachedToken()...');
        return new Promise(async (resolve, reject) => {
            const hasCachedToken = await this.lemonStorage.hasCachedToken();
            if (!hasCachedToken) {
                return reject('has no token!');
            }

            const shouldRefreshToken = await this.lemonStorage.shouldRefreshToken();
            if (shouldRefreshToken) {
                return this.refreshCachedToken()
                    .then(() => resolve('refresh token!'))
                    .catch(async err => {
                        this.logger.error('refreshCachedToken(): ', err);
                        this.logger.log('clear Storage...');
                        await this.lemonStorage.clearLemonOAuthToken();
                        reject(err);
                    });
            } else {
                // Build AWS credential without refresh token
                const credential = await this.lemonStorage.getCachedCredentialItems();
                this.createAWSCredentials(credential);
                return resolve('build credentials!');
            }
        });
    }

    private async refreshCachedToken(): Promise<LemonRefreshTokenResult> {
        this.logger.log('refreshCachedToken()...');
        const originToken: LemonOAuthTokenResult = await this.lemonStorage.getCachedLemonOAuthToken();
        const { authId: originAuthId, accountId, identityId, identityToken, identityPoolId } = originToken;

        const payload: SignaturePayload = { authId: originAuthId, accountId, identityId, identityToken };
        const current = new Date().toISOString();
        const signature = this.utils.calcSignature(payload, current);

        //! lemon-accounts-api
        //! $ http POST :8086/oauth/auth001/refresh 'current=2020-02-03T08:02:37.468Z' 'signature='
        //! INFO: requestWithCredentials()의 경우, 내부에서 getCredential() 호출하기 때문에 recursive 발생함
        this.logger.log('request refresh to OAUTH API');
        return this.request('POST', this.oauthURL, `/oauth/${originAuthId}/refresh`, {}, { current, signature })
            .then(async (result: LemonRefreshTokenResult) => {
                const { authId, accountId, identityId, credential } = result;
                const refreshToken: LemonOAuthTokenResult = { authId, accountId, identityPoolId, identityToken, identityId, credential };
                await this.lemonStorage.saveLemonOAuthToken(refreshToken);
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
