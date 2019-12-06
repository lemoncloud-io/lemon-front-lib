import * as AWS from 'aws-sdk/global';
import {
    CognitoRefreshToken, CognitoUserAttribute,
    CognitoUserSession,
    ICognitoUserSessionData,
    ISignUpResult,
} from 'amazon-cognito-identity-js';
import { Subject } from 'rxjs/index';

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
        return this.awsCredsService.getCredentials$().toPromise();
    }

    // Cognito Http
    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        return this.cognitoHttpService.request$(method, endpoint, path, params, body).toPromise();
    }

    // Cognito Service
    public getCurrentSession(): Promise<CognitoUserSession> {
        return this.cognitoService.getCurrentSession$().toPromise();
    }

    public getRefreshToken(): Promise<CognitoRefreshToken> {
        return this.cognitoService.getRefreshToken$().toPromise();
    }

    public refreshSession(token: CognitoRefreshToken): Promise<ICognitoUserSessionData> {
        // NOTE: new Observable...로 리턴하는 함수의 경우 toPromise()가 안됨
        return new Promise((resolve, reject) => this.cognitoService.refreshSession$(token).subscribe(resolve, reject));
    }

    public isAuthenticated(): Promise<boolean> {
        return this.cognitoService.isAuthenticated$().toPromise();
    }

    public authenticate(username: string, password: string, mfaCode?: Subject<string> | string): Promise<AuthenticationState> {
        return new Promise((resolve, reject) => this.cognitoService.authenticate$(username, password, mfaCode).subscribe(resolve, reject));
    }

    public forgotPassword(username: string): Promise<ForgotPasswordState> {
        return new Promise((resolve, reject) => this.cognitoService.forgotPassword$(username).subscribe(resolve, reject));
    }

    public confirmNewPassword(email: string, verificationCode: string, newPassword: string): Promise<ForgotPasswordState> {
        return new Promise((resolve, reject) => this.cognitoService.confirmNewPassword$(email, verificationCode, newPassword).subscribe(resolve, reject));
    }

    public logout(): void {
        return this.cognitoService.logout();
    }

    public register(user: any): Promise<ISignUpResult> { // should include username, password property
        return this.cognitoService.register$(user).toPromise();
    }

    public confirmRegistration(username: string, confirmationCode: string): Promise<any> {
        return this.cognitoService.confirmRegistration$(username, confirmationCode).toPromise();
    }

    public resendCode(username: string): Promise<any> {
        return this.cognitoService.resendCode$(username).toPromise();
    }

    public newPassword(oldPassword: string, newPassword: string): Promise<any> {
        return this.cognitoService.newPassword$(oldPassword, newPassword).toPromise();
    }

    public getUserAttributes(): Promise<CognitoUserAttribute[]> {
        return this.cognitoService.getUserAttributes$().toPromise();
    }
}
