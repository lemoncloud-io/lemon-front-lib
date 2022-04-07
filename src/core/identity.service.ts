import * as AWS from 'aws-sdk/global';

// services
import { LemonStorageService, Storage } from './lemon-storage.service';
import { calcSignature, createAsyncDelay, SignedHttpService } from '../helper';

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

    constructor(options: LemonOptions, storage?: Storage) {
        this.logger = new LoggerService('IDS', options);
        this.logger.log('initialize IdentityService(IDS)');

        this.setExtraData(options);
        const { project } = options;
        this.lemonStorage = new LemonStorageService(project, storage);

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

    async buildCredentialsByStorage(): Promise<void> {
        this.logger.log('buildCredentialsByStorage()...');
        const credential = await this.lemonStorage.getCachedCredentialItems();
        const { AccessKeyId, SecretKey } = credential;
        if (!AccessKeyId) {
            throw new Error('.AccessKeyId (string) is required!');
        }
        if (!SecretKey) {
            throw new Error('.SecretKey (string) is required!');
        }
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

    requestWithCredentials(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params: any = {},
        body?: any,
    ): Promise<any> {
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
            const refreshed = await this.refreshCachedToken();
            if (refreshed) {
                return await this.getCurrentCredentials();
            }
        }

        const cachedToken = await this.lemonStorage.hasCachedToken();
        if (!cachedToken) {
            this.logger.info('has no cached token!');
            return new Promise(resolve => resolve(null));
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
            return false;
        }

        const shouldRefreshToken = await this.lemonStorage.shouldRefreshToken();
        if (shouldRefreshToken) {
            this.logger.info('return isAuthenticated after refresh token');
            const refreshed = await this.refreshCachedToken();
            if (refreshed) {
                return true;
            }
        }

        const cachedToken = await this.lemonStorage.hasCachedToken();
        if (!cachedToken) {
            return false;
        }

        return new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-angle-bracket-type-assertion
            (<AWS.Credentials>AWS.config.credentials).get(error => {
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
        return this.lemonStorage
            .clearLemonOAuthToken()
            .then(() => true)
            .catch(() => false);
    }

    private setExtraData(options: LemonOptions) {
        const { oAuthEndpoint, extraHeader, extraOptions } = options;
        this.oauthURL = oAuthEndpoint;
        this.extraHeader = extraHeader ? extraHeader : {};
        this.extraOptions = extraOptions ? extraOptions : {};
    }

    private async checkCachedToken(): Promise<string> {
        this.logger.log('checkCachedToken()...');
        const hasCachedToken = await this.lemonStorage.hasCachedToken();
        if (!hasCachedToken) {
            throw Error('has no token!');
        }

        const shouldRefreshToken = await this.lemonStorage.shouldRefreshToken();
        if (shouldRefreshToken) {
            this.logger.info('should refresh token!');
            const refreshed = await this.refreshCachedToken();
            if (refreshed) {
                await this.getCurrentCredentials();
                return 'refresh token!';
            }
        }

        const cachedToken = await this.lemonStorage.hasCachedToken();
        if (!cachedToken) {
            throw Error('has no token!');
        }

        // build AWS credential without refresh
        const credential = await this.lemonStorage.getCachedCredentialItems();
        this.createAWSCredentials(credential);
        return 'build credentials!';
    }

    private async refreshCachedToken(): Promise<LemonRefreshTokenResult | null> {
        this.logger.log('refreshCachedToken()...');
        const originToken: LemonOAuthTokenResult = await this.lemonStorage.getCachedLemonOAuthToken();
        const payload: SignaturePayload = {
            authId: originToken.authId,
            accountId: originToken.accountId,
            identityId: originToken.identityId,
            identityToken: originToken.identityToken,
        };
        const current = new Date().toISOString();
        const signature = calcSignature(payload, current);

        //! lemon-accounts-api
        //! $ http POST :8086/oauth/auth001/refresh 'current=2020-02-03T08:02:37.468Z' 'signature='
        //! INFO: requestWithCredentials()의 경우, 내부에서 getCredential() 호출하기 때문에 recursive 발생함
        this.logger.log('request refresh to OAUTH API');
        const bodyData = { authId: originToken.authId, current, signature };
        const refreshResult: LemonRefreshTokenResult = await this.requestRefreshWithRetries(bodyData).catch(
            async err => {
                if (err === 'logout') {
                    if (!!window) {
                        const event = new CustomEvent('LOGOUT_FROM_LIB', { detail: { authId: originToken.authId } });
                        window.dispatchEvent(event);
                    }
                    this.logger.error('refresh token error:', err);
                    this.logger.log('clear Storage...');
                    await this.logout();
                }
                return null;
            },
        );
        if (!refreshResult) {
            return null;
        }

        const { credential } = refreshResult;
        const refreshToken: LemonOAuthTokenResult = {
            ...refreshResult,
            identityPoolId: originToken.identityPoolId,
            identityToken: originToken.identityToken,
        };
        await this.lemonStorage.saveLemonOAuthToken(refreshToken);
        this.logger.log('create new credentials after refresh token');
        this.createAWSCredentials(credential);
        return refreshResult;
    }

    private createAWSCredentials(credential: LemonCredentials) {
        const { AccessKeyId, SecretKey, SessionToken } = credential;
        AWS.config.credentials = new AWS.Credentials(AccessKeyId, SecretKey, SessionToken);
    }

    private getCurrentCredentials(): Promise<AWS.Credentials> {
        return new Promise((resolve, reject) => {
            const credentials = AWS.config.credentials as AWS.Credentials;
            credentials.get(error => {
                if (error) {
                    this.logger.error('Error on getCurrentCredentials: ', error);
                    reject(null);
                }
                this.logger.info('success to get AWS credentials');
                const awsCredentials = AWS.config.credentials as AWS.Credentials;
                resolve(awsCredentials);
            });
        });
    }

    private async requestRefreshWithRetries(data: { authId: string; current: string; signature: string }) {
        const { authId, current, signature } = data;
        let retryCount = 0;
        const nthTry = 10;
        do {
            try {
                return await this.request(
                    'POST',
                    this.oauthURL,
                    `/oauth/${authId}/refresh`,
                    {},
                    { current, signature },
                );
            } catch (error) {
                const is400Error =
                    error.status === 400 ||
                    error.status === '400' ||
                    error.response?.status === 400 ||
                    error.response?.status === '400';
                if (is400Error) {
                    return Promise.reject('logout');
                }
                const isLastAttempt = retryCount === nthTry;
                if (isLastAttempt) {
                    return Promise.reject(error);
                }
            }
            await createAsyncDelay(500);
        } while (retryCount++ < nthTry);
    }
}
