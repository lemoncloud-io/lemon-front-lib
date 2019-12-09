import * as AWS from 'aws-sdk/global';
import {
    CognitoRefreshToken, CognitoUserAttribute,
    CognitoUserSession,
    ICognitoUserSessionData,
    ISignUpResult,
} from 'amazon-cognito-identity-js';

import { CognitoService} from './cognito.service';
import { CognitoHttpService } from './cognito-http.service';
import { AWSCredsService } from './aws.service';

import { CognitoServiceConfig } from '../types/cognito.interface';
import { AuthenticationState } from '../types/authentication-state.type';
import { ForgotPasswordState } from '../types/forgot-password-state.type';

export class CoreService {

    private readonly cognitoService: CognitoService;
    private readonly cognitoHttpService: CognitoHttpService;
    private readonly awsCredsService: AWSCredsService;

    constructor(config: CognitoServiceConfig) {
        this.cognitoService = new CognitoService(config);
        this.cognitoHttpService = new CognitoHttpService(this.cognitoService);
        this.awsCredsService = new AWSCredsService(this.cognitoService);
    }

    // AWS Credentials
    public getCognitoIdentityCredentials(): Promise<AWS.CognitoIdentityCredentials> {
        return this.awsCredsService.getCredentials();
    }

    // Cognito Http
    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.cognitoHttpService.request$(method, endpoint, path, params, body);
    }

    // Cognito Service
    public getCurrentSession(): Promise<CognitoUserSession> {
        return this.cognitoService.getCurrentSession();
    }

    public getRefreshToken(): Promise<CognitoRefreshToken> {
        return this.cognitoService.getRefreshToken();
    }

    public refreshSession(token: CognitoRefreshToken): Promise<ICognitoUserSessionData> {
        // NOTE: new Observable...로 리턴하는 함수의 경우 toPromise()가 안됨
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
