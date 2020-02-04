import * as AWS from 'aws-sdk/global';

import { LemonOAuthTokenResult } from '../helper';
import { IdentityService } from './identity.service';

export class AuthService {

    private readonly identityService: IdentityService;

    constructor(oauthURL: string = 'http://localhost:8086') {
        this.identityService = new IdentityService(oauthURL);
    }

    public isAuthenticated(): Promise<boolean> {
        return this.identityService.isAuthenticated();
    }

    public buildCredentialsByToken(token: LemonOAuthTokenResult): Promise<AWS.Credentials> {
        this.identityService.buildCredentialsByToken(token);
        return this.identityService.getCredentials();
    }

    public getCredentials(): Promise<AWS.Credentials | null> {
        return this.identityService.getCredentials()
            .catch(() => null);
    }

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.identityService.requestWithSign(method, endpoint, path, params, body);
    }

    public logout(): Promise<boolean> {
        return this.identityService.logout();
    }
}
