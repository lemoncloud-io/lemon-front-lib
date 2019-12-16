import { Credentials } from 'aws-sdk/lib/credentials';

import { IdentityService } from '../identity';

export class SocialAuthService {

    private identityService: IdentityService;

    constructor() {
    }

    public buildCredentialsByToken(accessKeyId: string, secretKey: string, sessionToken?: string): void {
        this.identityService = new IdentityService(accessKeyId, secretKey, sessionToken);
    }

    public getCredentials(): Promise<Credentials | null> {
        return this.identityService.getCredentials();
    }

    public isAuthenticated(): Promise<boolean> {
        return this.identityService.isAuthenticated();
    }

    public logout(): void {
        return this.identityService.logout();
    }

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.identityService.request(method, endpoint, path, params, body);
    }
}
