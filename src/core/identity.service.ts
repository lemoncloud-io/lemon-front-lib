import * as AWS from 'aws-sdk/global.js';
// services
import { LemonStorageService, Storage } from './lemon-storage.service';
import { AxiosService, calcSignature, createAsyncDelay, SignedHttpService } from '../helper';
// types
import { RequiredHttpParameters, SignaturePayload } from '../helper';
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
    private extraHeader: any = {};
    private extraOptions: Omit<AxiosRequestConfig, 'headers'> = {};
    private shouldUseXLemonIdentity: boolean = false;
    private options: LemonOptions;

    private readonly lemonStorage: LemonStorageService;
    private readonly logger: LoggerService;

    constructor(options: LemonOptions, storage?: Storage) {
        this.logger = new LoggerService('IDS', options);
        this.logger.log('initialize IdentityService(IDS)');

        this.options = options;
        const { project } = options;
        this.lemonStorage = new LemonStorageService(project, storage);
        this.setExtraData(options);

        this.checkCachedToken()
            .then(result => this.logger.log('checkCachedToken: ', result))
            .catch(() => this.logger.log('checkCachedToken: has no token'));
    }

    setOptions(options: LemonOptions) {
        this.options = options;
        this.setExtraData(options);
    }

    updateStoragePrefix(projectName: string) {
        this.lemonStorage.updatePrefix(projectName);
    }

    getSavedCredentials(): Promise<{ [key: string]: string }> {
        return this.lemonStorage.getAllItems();
    }

    async buildCredentialsByToken(token: LemonOAuthTokenResult): Promise<void> {
        this.logger.log('buildCredentialsByToken()...');
        // TODO: refactor below. create class
        const isAWS = this.options.cloud === 'aws';
        const isAzure = this.options.cloud === 'azure';
        if (isAWS) {
            return this.buildAWSCredentialsByToken(token);
        }
        if (isAzure) {
            this.logger.log('Using AWS platform');
            return await this.lemonStorage.saveLemonOAuthToken(token);
        }
    }

    async buildCredentialsByStorage(): Promise<void> {
        this.logger.log('buildCredentialsByStorage()...');
        const credential = await this.lemonStorage.getCachedCredentialItems();
        const isAWS = this.options.cloud === 'aws';
        if (!isAWS) {
            return;
        }

        const { AccessKeyId, SecretKey } = credential;
        if (!AccessKeyId) {
            throw new Error('.AccessKeyId (string) is required!');
        }
        if (!SecretKey) {
            throw new Error('.SecretKey (string) is required!');
        }
        IdentityService.createAWSCredentials(credential);
    }

    async request(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params: any = {},
        bodyReq?: any
    ): Promise<any> {
        const queryParams = { ...params };
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        const isAWS = this.options.cloud === 'aws';
        const isAzure = this.options.cloud === 'azure';
        if (isAWS) {
            if (!this.shouldUseXLemonIdentity) {
                const options = { customHeader: this.extraHeader, customOptions: this.extraOptions };
                const httpService = new SignedHttpService(options);
                return httpService.request(endpoint, objParams);
            }

            // add X-Lemon-Identity
            const identityId = (await this.lemonStorage.getItem('identityId')) || '';
            const identityToken = (await this.lemonStorage.getItem('identityToken')) || '';
            const shouldSetXLemonIdentity = !!identityId && !!identityToken;
            const customHeader = shouldSetXLemonIdentity
                ? { ...this.extraHeader, 'x-lemon-identity': identityToken }
                : { ...this.extraHeader };
            const options = { customHeader, customOptions: this.extraOptions };
            const httpService = new SignedHttpService(options);
            return httpService.request(endpoint, objParams);
        }

        if (isAzure) {
            const accessToken = (await this.lemonStorage.getItem('identityToken')) || '';
            const header = {
                Authorization: `Bearer ${accessToken}`,
            };
            return this.executeRequest(header, endpoint, objParams);
        }
    }

    requestWithCredentials(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params: any = {},
        body?: any
    ): Promise<any> {
        return this.getCredentials().then(() => this.request(method, endpoint, path, params, body));
    }

    async getCredentials(): Promise<AWS.Credentials | null> {
        const isAWS = this.options.cloud === 'aws';
        const isAzure = this.options.cloud === 'azure';
        if (isAzure) {
            return null;
        }
        if (isAWS) {
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
        }
        return null;
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
            (<AWS.Credentials>AWS.config.credentials).get(error => {
                if (error) {
                    this.logger.error('get AWSConfig.credentials error: ', error);
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
        this.shouldUseXLemonIdentity = options.shouldUseXLemonIdentity || false;
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
        IdentityService.createAWSCredentials(credential);
        return 'build credentials!';
    }

    async refreshCachedToken(): Promise<LemonRefreshTokenResult | null> {
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
                    if (window) {
                        const event = new CustomEvent('LOGOUT_FROM_LIB', { detail: { authId: originToken.authId } });
                        window.dispatchEvent(event);
                    }
                    this.logger.error('refresh token error:', err);
                    this.logger.log('clear Storage...');
                    await this.logout();
                }
                return null;
            }
        );
        if (!refreshResult) {
            return null;
        }

        const { credential } = refreshResult;
        const refreshToken: LemonOAuthTokenResult = {
            ...refreshResult,
            identityPoolId: originToken.identityPoolId || '',
            identityToken: originToken.identityToken,
        };
        await this.lemonStorage.saveLemonOAuthToken(refreshToken);

        // AWS
        this.logger.log('create new credentials after refresh token');
        IdentityService.createAWSCredentials(credential);
        return refreshResult;
    }

    private static createAWSCredentials(credential: LemonCredentials) {
        const { AccessKeyId, SecretKey, SessionToken } = credential;
        AWS.config.credentials = new AWS.Credentials(AccessKeyId, SecretKey, SessionToken);
    }

    private getCurrentCredentials(): Promise<AWS.Credentials> {
        return new Promise((resolve, reject) => {
            const credentials = AWS.config.credentials as AWS.Credentials;

            credentials?.get(error => {
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
                    { current, signature }
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

    // TODO: abstract this
    private executeRequest(header: any, endpoint: string, objParams: RequiredHttpParameters) {
        // execute http request.
        const { method, path, queryParams, bodyReq } = objParams;
        const headers = header;
        const axiosService = new AxiosService({ headers });
        switch (method.toUpperCase()) {
            case 'POST':
                return axiosService.post(endpoint + path, bodyReq, queryParams);
            case 'PUT':
                return axiosService.put(endpoint + path, bodyReq, queryParams);
            case 'DELETE':
                return axiosService.delete(endpoint + path, queryParams);
            case 'PATCH':
                return axiosService.patch(endpoint + path, bodyReq, queryParams);
            case 'GET':
            default:
                return axiosService.get(endpoint + path, queryParams);
        }
    }

    private async buildAWSCredentialsByToken(token: LemonOAuthTokenResult): Promise<void> {
        const { credential } = token;
        const { AccessKeyId, SecretKey } = credential;
        if (!AccessKeyId) {
            throw new Error('.AccessKeyId (string) is required!');
        }
        if (!SecretKey) {
            throw new Error('.SecretKey (string) is required!');
        }
        this.logger.log('Using AWS platform');
        await this.lemonStorage.saveLemonOAuthToken(token);
        return IdentityService.createAWSCredentials(credential);
    }
}
