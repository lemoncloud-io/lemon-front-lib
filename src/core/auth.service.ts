import * as AWS from 'aws-sdk/global';

import { LemonOAuthTokenResult, LemonOptions } from '../helper';
import { IdentityService } from './identity.service';
import { ProviderIdentityService } from './provider-identity.service';
import { Storage } from './lemon-storage.service';

export type Provider = 'naver' | 'kakao' | 'apple' | 'google' | '';

export class AuthService {
    private readonly identityService: IdentityService;
    private providerIdentityService: ProviderIdentityService;

    constructor(options: LemonOptions, storage?: Storage) {
        this.identityService = new IdentityService(options, storage);
        this.providerIdentityService = new ProviderIdentityService(options, storage);
    }

    createProviderIdentity(provider: Provider) {
        this.providerIdentityService.createProviderIdentity(provider);
    }

    getSavedToken(provider: Provider = ''): Promise<{ [key: string]: string }> {
        if (provider) {
            return this.providerIdentityService.getSavedCredentials(provider);
        }
        return this.identityService.getSavedCredentials();
    }

    setProviderOptions(provider: Provider, options: LemonOptions) {
        this.providerIdentityService.setOptions(provider, options);
    }

    setLemonOptions(options: LemonOptions) {
        this.identityService.setOptions(options);
    }

    isAuthenticated(provider: Provider = ''): Promise<boolean> {
        if (provider) {
            return this.providerIdentityService.isAuthenticated(provider);
        }
        return this.identityService.isAuthenticated();
    }

    async buildProviderCredentialsByToken(provider: Provider, token: LemonOAuthTokenResult): Promise<AWS.Credentials> {
        await this.providerIdentityService.buildCredentialsByToken(provider, token);
        return await this.providerIdentityService.getCredentials(provider);
    }

    async buildProviderCredentialsByStorage(provider: Provider): Promise<AWS.Credentials> {
        await this.providerIdentityService.buildCredentialsByStorage(provider);
        return await this.providerIdentityService.getCredentials(provider);
    }

    getProviderCredentials(provider: Provider): Promise<AWS.Credentials | null> {
        return this.providerIdentityService.getCredentials(provider).catch(() => null);
    }

    async buildCredentialsByToken(token: LemonOAuthTokenResult): Promise<AWS.Credentials> {
        await this.identityService.buildCredentialsByToken(token);
        return await this.identityService.getCredentials();
    }

    async buildCredentialsByStorage(): Promise<AWS.Credentials> {
        await this.identityService.buildCredentialsByStorage();
        return await this.identityService.getCredentials();
    }

    getCredentials(): Promise<AWS.Credentials | null> {
        return this.identityService.getCredentials().catch(() => null);
    }

    request(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params?: any,
        body?: any,
        provider?: Provider,
    ): Promise<any> {
        if (provider) {
            return this.providerIdentityService.request(method, endpoint, path, params, body, provider);
        }
        return this.identityService.request(method, endpoint, path, params, body);
    }

    requestWithCredentials(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params?: any,
        body?: any,
        provider?: Provider,
    ): Promise<any> {
        if (provider) {
            return this.providerIdentityService.requestWithCredentials(method, endpoint, path, params, body, provider);
        }
        return this.identityService.requestWithCredentials(method, endpoint, path, params, body);
    }

    logout(provider: Provider): Promise<boolean> {
        if (provider) {
            return this.providerIdentityService.logout(provider);
        }
        return this.identityService.logout();
    }
}
