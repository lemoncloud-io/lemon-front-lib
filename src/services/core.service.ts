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
import { SocialAuthService } from './social-auth.service';

// TOOD: 문서화작업 or 주석 추가
export class CoreService {

    private readonly cognitoService: CognitoService;
    private readonly cognitoHttpService: CognitoHttpService;
    private readonly awsCredsService: AWSCredsService;
    private socialAuthService: SocialAuthService | null = null;

    constructor(config: CognitoServiceConfig) {
        this.cognitoService = new CognitoService(config);
        this.cognitoHttpService = new CognitoHttpService(this.cognitoService);
        this.awsCredsService = new AWSCredsService(this.cognitoService);
    }

    public setCredentialsByToken

    // NOTE: 앱 실행될 때마다 아래 함수 호출
    public getCredentialsBySocialLogin(accessKeyId: string, secretKey: string, sessionToken?: string): Promise<AWS.Credentials> {
        this.socialAuthService = new SocialAuthService(accessKeyId, secretKey, sessionToken);
        return this.socialAuthService.getCredentials();
    }

    // NOTE: 앱 실행될 때마다 아래 함수 호출
    public getCognitoIdentityCredentials(): Promise<AWS.CognitoIdentityCredentials> {
        return this.awsCredsService.getCredentials();
    }

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        if (this.checkIsSocialLogin()) {
            return this.socialAuthService.request(method, endpoint, path, params, body);
        }
        return this.cognitoHttpService.request(method, endpoint, path, params, body);
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
        if (this.checkIsSocialLogin()) {
            return this.socialAuthService.isAuthenticated();
        }
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
        if (this.checkIsSocialLogin()) {
            return this.socialAuthService.logout();
        }
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

    // TODO: 소셜 로그인인지 체크하는 로직 개선
    private checkIsSocialLogin(): boolean {
        if (this.socialAuthService === null) {
            return false;
        }
        return true;
    }
}
