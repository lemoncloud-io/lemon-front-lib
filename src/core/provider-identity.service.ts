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
import { Provider } from './auth.service';

export interface ProviderIdentity {
    provider: Provider;
    lemonStorage: LemonStorageService;
    credentials?: AWS.Credentials;
}

export class ProviderIdentityService {
    private identities: ProviderIdentity[] = [];
    private oauthURL: string = '';
    private extraHeader: any = {};
    private extraOptions: any = {};
    private project: string = '';
    private readonly storage: Storage;
    private readonly logger: LoggerService;
    private readonly utils: UtilsService;

    constructor(options: LemonOptions, storage?: Storage) {
        this.storage = storage; // to create LemonStorageService instance
        this.utils = new UtilsService();
        this.logger = new LoggerService('PIS', options);
        this.logger.log('initialize ProviderIdentityService(PIS)');
        this.setExtraData(options);
    }

    getProviderIdentity(provider: Provider): ProviderIdentity | null {
        if (!provider) {
            return null;
        }
        const identities = this.identities.filter(identity => identity.provider === provider);
        const hasNoProviderIdentity = identities.length === 0;
        if (hasNoProviderIdentity) {
            return null;
        }
        return identities[0];
    }

    createProviderIdentity(provider: Provider) {
        const prefix = `${this.project}_${provider}`;
        const lemonStorage = new LemonStorageService(prefix, this.storage);
        const identity = { provider, lemonStorage };
        this.identities.push(identity);
        this.checkCachedToken(provider)
            .then(result => this.logger.log('checkCachedToken: ', result))
            .catch(err => this.logger.log('checkCachedToken: ', err));
    }

    setOptions(provider: Provider, options: LemonOptions) {
        this.setExtraData(options);
    }

    getSavedCredentials(provider: Provider): Promise<{ [key: string]: string }> {
        const identity = this.getProviderIdentity(provider);
        if (!identity) {
            return new Promise(resolve => resolve(null));
        }
        return identity.lemonStorage.getAllItems();
    }

    async buildCredentialsByToken(provider: Provider, token: LemonOAuthTokenResult): Promise<void> {
        this.logger.log('buildCredentialsByToken()...');

        const { credential } = token;
        const { AccessKeyId, SecretKey } = credential;
        if (!AccessKeyId) {
            throw new Error('.AccessKeyId (string) is required!');
        }
        if (!SecretKey) {
            throw new Error('.SecretKey (string) is required!');
        }

        const identity = this.getProviderIdentity(provider);
        if (!identity) {
            throw new Error('Not initialized provider identity!');
        }

        const { lemonStorage } = identity;
        await lemonStorage.saveLemonOAuthToken(token);
        this.createAndSetAWSCredentials(provider, credential);
    }

    async buildCredentialsByStorage(provider: Provider): Promise<void> {
        this.logger.log('buildCredentialsByStorage()...');
        const identity = this.getProviderIdentity(provider);
        if (!identity) {
            throw new Error('Not initialized provider identity!');
        }

        const credential = await identity.lemonStorage.getCachedCredentialItems();
        const { AccessKeyId, SecretKey } = credential;
        if (!AccessKeyId) {
            throw new Error('.AccessKeyId (string) is required!');
        }
        if (!SecretKey) {
            throw new Error('.SecretKey (string) is required!');
        }
        this.createAndSetAWSCredentials(provider, credential);
    }

    request(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params: any = {},
        body?: any,
        provider?: Provider,
    ): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };
        const options = { customHeader: this.extraHeader, customOptions: this.extraOptions };

        if (provider) {
            const identity = this.getProviderIdentity(provider);
            if (!identity || !identity.credentials) {
                throw new Error('Not initialized provider identity!');
            }
            const httpService = new SignedHttpService(options, identity.credentials);
            return httpService.request(endpoint, objParams);
        }

        const httpService = new SignedHttpService(options);
        return httpService.request(endpoint, objParams);
    }

    requestWithCredentials(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params: any = {},
        body?: any,
        provider?: Provider,
    ): Promise<any> {
        if (provider) {
            return this.getCredentials(provider).then(() =>
                this.request(method, endpoint, path, params, body, provider),
            );
        }
        return this.getCredentials(provider).then(() => this.request(method, endpoint, path, params, body, provider));
    }

    async getCredentials(provider: Provider): Promise<AWS.Credentials | null> {
        const identity = this.getProviderIdentity(provider);
        if (!identity) {
            throw new Error('Not initialized provider identity!');
        }

        const hasCachedToken = await identity.lemonStorage.hasCachedToken();
        if (!hasCachedToken) {
            this.logger.info('has no cached token!');
            return new Promise(resolve => resolve(null));
        }

        const shouldRefreshToken = await identity.lemonStorage.shouldRefreshToken();
        if (shouldRefreshToken) {
            this.logger.info('should refresh token!');
            return this.refreshCachedToken(provider).then(() => this.getCurrentCredentials(provider));
        }

        const shouldRefresh = identity.credentials.needsRefresh();
        if (shouldRefresh) {
            return identity.credentials.refreshPromise().then(() => this.getCurrentCredentials(provider));
        }
        return this.getCurrentCredentials(provider);
    }

    async isAuthenticated(provider: Provider): Promise<boolean> {
        const identity = this.getProviderIdentity(provider);
        if (!identity) {
            return new Promise(resolve => resolve(false));
        }
        const { lemonStorage } = identity;
        const hasCachedToken = await lemonStorage.hasCachedToken();
        if (!hasCachedToken) {
            return new Promise(resolve => resolve(false));
        }

        const shouldRefreshToken = await lemonStorage.shouldRefreshToken();
        if (shouldRefreshToken) {
            this.logger.info('return isAuthenticated after refresh token');
            return new Promise(resolve => {
                this.refreshCachedToken(provider)
                    .then(() => resolve(true))
                    .catch(() => resolve(false));
            });
        }

        return new Promise(resolve => {
            const credentials = identity.credentials as AWS.Credentials;
            if (!credentials || !credentials.hasOwnProperty('get')) {
                this.logger.error('isAuthenticated Error: No AWS.config.credentials');
                resolve(false);
            }
            credentials.get(error => {
                if (error) {
                    this.logger.error('get AWS.config.credentials error: ', error);
                }
                const isAuthenticated = !error;
                resolve(isAuthenticated);
            });
        });
    }

    logout(provider: Provider): Promise<boolean> {
        const identity = this.getProviderIdentity(provider);
        if (!identity) {
            return new Promise(resolve => resolve(false));
        }

        return identity.lemonStorage
            .clearLemonOAuthToken()
            .then(() => true)
            .catch(() => false);
    }

    private setExtraData(options: LemonOptions) {
        const { oAuthEndpoint, extraHeader, extraOptions, project } = options;
        this.project = project;
        this.oauthURL = oAuthEndpoint;
        this.extraHeader = extraHeader ? extraHeader : {};
        this.extraOptions = extraOptions ? extraOptions : {};
    }

    private checkCachedToken(provider: Provider): Promise<string> {
        this.logger.log('checkCachedToken()...');

        return new Promise(async (resolve, reject) => {
            const identity = this.getProviderIdentity(provider);
            if (!identity) {
                return reject(`has no provider identity. Provider: ${provider}`);
            }

            const hasCachedToken = await identity.lemonStorage.hasCachedToken();
            if (!hasCachedToken) {
                return reject('has no token!');
            }

            const shouldRefreshToken = await identity.lemonStorage.shouldRefreshToken();
            if (shouldRefreshToken) {
                return this.refreshCachedToken(provider)
                    .then(() => resolve('refresh token!'))
                    .catch(async err => {
                        this.logger.error('refreshCachedToken(): ', err);
                        this.logger.log('clear Storage...');
                        await identity.lemonStorage.clearLemonOAuthToken();
                        reject(err);
                    });
            }
            // Build AWS credential without refresh token
            const credential = await identity.lemonStorage.getCachedCredentialItems();
            this.createAndSetAWSCredentials(provider, credential);
            return resolve('build credentials!');
        });
    }

    private async refreshCachedToken(provider: Provider): Promise<LemonRefreshTokenResult> {
        this.logger.log('refreshCachedToken()...');
        const identity = this.getProviderIdentity(provider);
        if (!identity) {
            return;
        }

        const originToken: LemonOAuthTokenResult = await identity.lemonStorage.getCachedLemonOAuthToken();
        const { authId: originAuthId, accountId, identityId, identityToken, identityPoolId } = originToken;

        const payload: SignaturePayload = { authId: originAuthId, accountId, identityId, identityToken };
        const current = new Date().toISOString();
        const signature = this.utils.calcSignature(payload, current);

        //! lemon-accounts-api
        //! $ http POST :8086/oauth/auth001/refresh 'current=2020-02-03T08:02:37.468Z' 'signature='
        //! INFO: requestWithCredentials()의 경우, 내부에서 getCredential() 호출하기 때문에 recursive 발생함
        this.logger.log('request refresh to OAUTH API');
        return this.request(
            'POST',
            this.oauthURL,
            `/oauth/${originAuthId}/refresh`,
            {},
            { current, signature },
            provider,
        ).then(async (result: LemonRefreshTokenResult) => {
            const { authId, accountId, identityId, credential } = result;
            const refreshToken: LemonOAuthTokenResult = {
                authId,
                accountId,
                identityPoolId,
                identityToken,
                identityId,
                credential,
            };
            await identity.lemonStorage.saveLemonOAuthToken(refreshToken);
            this.logger.log('create new credentials after refresh token');
            this.createAndSetAWSCredentials(provider, credential);
            return result;
        });
    }

    private createAndSetAWSCredentials(provider: Provider, credential: LemonCredentials) {
        const { AccessKeyId, SecretKey, SessionToken } = credential;
        const credentials = new AWS.Credentials(AccessKeyId, SecretKey, SessionToken);
        // TODO: AWS.config.credentials => Global로 해야하는지 확인
        // AWS.config.credentials = new AWS.Credentials(AccessKeyId, SecretKey, SessionToken);
        this.identities.map(identity => {
            if (identity.provider === provider) {
                return { ...identity, credentials };
            }
            return identity;
        });
    }

    private getCurrentCredentials(provider: Provider): Promise<AWS.Credentials> {
        return new Promise((resolve, reject) => {
            const identity = this.getProviderIdentity(provider);
            if (!identity) {
                this.logger.error('Error on getCurrentCredentials: No identity');
                reject(null);
            }

            const credentials = identity.credentials as AWS.Credentials;
            if (!credentials || !credentials.hasOwnProperty('get')) {
                this.logger.error('Error on getCurrentCredentials: No AWS.config.credentials');
                reject(null);
            }

            credentials.get(error => {
                if (error) {
                    this.logger.error('Error on getCurrentCredentials: ', error);
                    reject(null);
                }
                this.logger.info('success to get AWS credentials');
                resolve(credentials);
            });
        });
    }
}
