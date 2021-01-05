import * as AWS from 'aws-sdk/global';

import { LemonOAuthTokenResult, LemonOptions } from '../helper';
import { IdentityService } from './identity.service';
import { Storage } from './lemon-storage.service';

export class AuthService {

    private readonly identityService: IdentityService;

    constructor(options: LemonOptions,
                storage?: Storage) {
        this.identityService = new IdentityService(options, storage);
    }

    setLemonOptions(options: LemonOptions) {
        this.identityService.setOptions(options);
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

    request(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.identityService.request(method, endpoint, path, params, body);
    }

    requestWithCredentials(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.identityService.requestWithCredentials(method, endpoint, path, params, body);
    }

    logout(): Promise<boolean> {
        return this.identityService.logout();
    }
}
