import * as AWS from 'aws-sdk/global';
import {
    CognitoRefreshToken, CognitoUserAttribute,
    CognitoUserSession,
    ICognitoUserSessionData,
    ISignUpResult,
} from 'amazon-cognito-identity-js';

import { CognitoService, CognitoAWSService } from '../cognito';

import { CognitoServiceConfig } from '../helper/types/cognito.interface';
import { AuthenticationState } from '../helper/types/authentication-state.type';
import { ForgotPasswordState } from '../helper/types/forgot-password-state.type';

export class UserPoolService {

    private readonly cognitoService: CognitoService;
    private readonly cognitoAWSService: CognitoAWSService;

    constructor(config: CognitoServiceConfig) {
        this.cognitoService = new CognitoService(config);
        this.cognitoAWSService = new CognitoAWSService(this.cognitoService);
    }

    // NOTE: 앱 실행될 때마다 아래 함수 호출
    public getCognitoCredentials(): Promise<AWS.CognitoIdentityCredentials> {
        return this.cognitoAWSService.getCredentials();
    }

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.cognitoService.request(method, endpoint, path, params, body);
    }

    public getCurrentSession(): Promise<CognitoUserSession> {
        return this.cognitoService.getCurrentSession();
    }

    public getRefreshToken(): Promise<CognitoRefreshToken> {
        return this.cognitoService.getRefreshToken();
    }

    public refreshSession(token: CognitoRefreshToken): Promise<ICognitoUserSessionData> {
        return this.cognitoService.refreshSession(token);
    }

    public isAuthenticated(): Promise<boolean> {
        return this.cognitoService.isAuthenticated();
    }

    public authenticate(username: string, password: string, mfaCode?: string): Promise<AuthenticationState> {
        return this.cognitoService.authenticate(username, password, mfaCode);
    }

    public forgotPassword(username: string): Promise<ForgotPasswordState> {
        return this.cognitoService.forgotPassword(username);
    }

    public confirmNewPassword(email: string, verificationCode: string, newPassword: string): Promise<ForgotPasswordState> {
        return this.cognitoService.confirmNewPassword(email, verificationCode, newPassword);
    }

    public logout(): void {
        return this.cognitoService.logout();
    }

    public register(user: any): Promise<ISignUpResult> { // should include email, password property
        return this.cognitoService.register(user);
    }

    public confirmRegistration(username: string, confirmationCode: string): Promise<any> {
        return this.cognitoService.confirmRegistration(username, confirmationCode);
    }

    public resendCode(username: string): Promise<any> {
        return this.cognitoService.resendCode(username);
    }

    public newPassword(oldPassword: string, newPassword: string): Promise<any> {
        return this.cognitoService.newPassword(oldPassword, newPassword);
    }

    public getUserAttributes(): Promise<CognitoUserAttribute[] | void> {
        return this.cognitoService.getUserAttributes();
    }

}
