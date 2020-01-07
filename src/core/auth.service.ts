import * as AWS from 'aws-sdk/global';

import { IdentityService } from './identity.service';

export class AuthService {

    private readonly identityService: IdentityService;

    constructor() {
        this.identityService = new IdentityService();
    }

    public isAuthenticated(): Promise<boolean> {
        return this.identityService.isAuthenticated();
    }

    // for login
    public buildCredentialsByToken(accessKeyId: string, secretKey: string, sessionToken?: string): Promise<AWS.Credentials> {
        this.identityService.buildCredentialsByToken(accessKeyId, secretKey, sessionToken);
        return this.identityService.getCredentials();
    }

    public getCredentials(): Promise<AWS.Credentials | null> {
        return this.identityService.getCredentials()
            .catch(() => null);
    }

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.identityService.requestWithSign(method, endpoint, path, params, body);
    }

    public logout() {
        this.identityService.logout();
    }
}
