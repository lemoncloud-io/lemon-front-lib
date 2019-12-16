import * as AWS from 'aws-sdk/global';

import { CognitoServiceConfig } from '../helper';
import { UserPoolService } from './user-pool.service';
import { SocialAuthService } from './social-auth.service';

export class LemonCoreService {

    private userPoolService: UserPoolService;
    private socialAuthService: SocialAuthService;

    constructor(config: CognitoServiceConfig) {
        this.userPoolService = new UserPoolService(config);
        this.socialAuthService = new SocialAuthService();
    }

    public isAuthenticated(): Promise<boolean> {
        return new Promise((resolve) => {
            Promise.all([this.userPoolService.isAuthenticated(), this.socialAuthService.isAuthenticated()])
                .then(([isUserPoolLogin, isSocialLogin]) => {
                    const isAuthenticated = isUserPoolLogin || isSocialLogin;
                    if (isAuthenticated) {
                        resolve(true);
                    }
                    resolve(false);
                })
                .catch(() => resolve(false))
        });
    }

    public getIdentityCredentials(): Promise<AWS.Credentials | AWS.CognitoIdentityCredentials | null> {
        return this.socialAuthService.isAuthenticated()
            .then(isSocialLogin => {
                return isSocialLogin
                    ? this.socialAuthService.getCredentials()
                    : this.userPoolService.getCognitoCredentials();
            })
            .catch(() => null);
    }

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.socialAuthService.isAuthenticated()
            .then(isSocialLogin => {
                return isSocialLogin
                    ? this.socialAuthService.requestWithSign(method, endpoint, path, params, body)
                    : this.userPoolService.requestWithSign(method, endpoint, path, params, body);
            });
    }

    public logout() {
        this.userPoolService.logout();
        this.socialAuthService.logout();
    }

    public buildCredentialsByToken(accessKeyId: string, secretKey: string, sessionToken?: string): Promise<AWS.Credentials> {
        this.socialAuthService.buildCredentialsByToken(accessKeyId, secretKey, sessionToken);
        return this.socialAuthService.getCredentials();
    }

    public getUserPoolInstance() {
        return this.userPoolService;
    }

    public getSocialAuthInstance() {
        return this.socialAuthService;
    }
}