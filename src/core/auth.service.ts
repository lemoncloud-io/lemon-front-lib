import * as AWS from 'aws-sdk/global';

import { LemonOAuthTokenResult, LemonOptions } from '../helper';
import { IdentityService } from './identity.service';
import { AxiosRequestConfig } from 'axios';

export class AuthService {

    private readonly identityService: IdentityService;

    constructor(options: LemonOptions) {
        this.identityService = new IdentityService(options);
    }

    isAuthenticated(): Promise<boolean> {
        return this.identityService.isAuthenticated();
    }

    buildCredentialsByToken(token: LemonOAuthTokenResult): Promise<AWS.Credentials> {
        this.identityService.buildCredentialsByToken(token);
        return this.identityService.getCredentials();
    }

    getCredentials(): Promise<AWS.Credentials | null> {
        return this.identityService.getCredentials()
            .catch(() => null);
    }

    request(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any, axiosConfig?: AxiosRequestConfig): Promise<any> {
        return this.identityService.request(method, endpoint, path, params, body, axiosConfig);
    }

    requestWithCredentials(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any, axiosConfig?: AxiosRequestConfig): Promise<any> {
        return this.identityService.requestWithCredentials(method, endpoint, path, params, body, axiosConfig);
    }

    logout(): Promise<boolean> {
        return this.identityService.logout();
    }
}
