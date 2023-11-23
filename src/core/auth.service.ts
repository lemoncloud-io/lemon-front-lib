import * as AWS from 'aws-sdk/global.js';
import { LemonOAuthTokenResult, LemonOptions } from '../helper';
import { IdentityService } from './identity.service';
import { Storage } from './lemon-storage.service';

/**
 * core service for authentication processing
 */
export class AuthService {
    private readonly identityService: IdentityService;

    constructor(options: LemonOptions, storage?: Storage) {
        this.identityService = new IdentityService(options, storage);
    }

    /**
     * return token information stored in local storage
     */
    getSavedToken(): Promise<{ [key: string]: string }> {
        return this.identityService.getSavedCredentials();
    }

    /**
     * set a request header or set the Axios Request Config. If you no longer use extra options, you need to reset it after the request.
     * @param options
     */
    setLemonOptions(options: LemonOptions) {
        this.identityService.setOptions(options);
        this.identityService.updateStoragePrefix(options.project);
    }

    /**
     * check login status with AWS Credentials
     */
    isAuthenticated(): Promise<boolean> {
        return this.identityService.isAuthenticated();
    }

    /**
     * generate AWS Credentials with token issued through LEMON-OAUTH-API
     * @param token
     */
    async buildCredentialsByToken(token: LemonOAuthTokenResult): Promise<AWS.Credentials> {
        await this.identityService.buildCredentialsByToken(token);
        return await this.identityService.getCredentials();
    }

    /**
     * generate AWS Credentials from data stored on Local Storage
     */
    async buildCredentialsByStorage(): Promise<AWS.Credentials> {
        await this.identityService.buildCredentialsByStorage();
        return await this.identityService.getCredentials();
    }

    /**
     * get the current AWS Credentials and automatically renews the token when it expires. If has not, it returns null.
     */
    getCredentials(): Promise<AWS.Credentials | null> {
        return this.identityService.getCredentials().catch(() => null);
    }

    /**
     * HTTP request using Axios. If there are AWS Credentials on browser, request HTTP with AWS V4 Signing
     * @param method
     * @param endpoint
     * @param path
     * @param params
     * @param body
     */
    request(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.identityService.request(method, endpoint, path, params, body);
    }

    /**
     * execute the request() function above after executing getCredentials() function
     * @param method
     * @param endpoint
     * @param path
     * @param params
     * @param body
     */
    requestWithCredentials(
        method: string = 'GET',
        endpoint: string,
        path: string,
        params?: any,
        body?: any
    ): Promise<any> {
        return this.identityService.requestWithCredentials(method, endpoint, path, params, body);
    }

    /**
     * clear AWS Credentials and delete Local Storage data
     */
    logout(): Promise<boolean> {
        return this.identityService.logout();
    }
}
