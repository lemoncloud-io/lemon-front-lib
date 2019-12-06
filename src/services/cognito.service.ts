// ref: https://github.com/BrunoLemonnier/aws-cognito-angular-quickstart
import * as AWS from 'aws-sdk/global';
import {
    AuthenticationDetails,
    CognitoUserPool,
    CognitoUser,
    CognitoUserAttribute,
    CognitoUserSession,
    ISignUpResult,
    ICognitoUserPoolData, CognitoRefreshToken, ICognitoUserSessionData,
} from 'amazon-cognito-identity-js';

import { Subject, Observable, Observer } from 'rxjs';
import { bindNodeCallback, of, throwError } from 'rxjs';
import { concatMap, map, switchMap, catchError } from 'rxjs/operators';

import { CognitoServiceConfig } from '../types/cognito.interface';
import {
    AuthenticationState,
    AuthenticationSuccess,
    UserNotFound,
    NotAuthorized,
    NewPasswordRequired,
    MFARequired,
    CustomChallenge,
} from '../types/authentication-state.type';
import {
    CodeMismatch,
    ForgotPasswordState,
    ForgotPasswordSuccess,
    ForgotPasswordUserNotFound,
    InputVerificationCode,
} from '../types/forgot-password-state.type';

export class CognitoService {

    private config: CognitoServiceConfig;
    private userPool: CognitoUserPool;

    constructor(config: CognitoServiceConfig) {
        this.config = config;

        const poolData: ICognitoUserPoolData = {
            UserPoolId: this.config.userPoolId,
            ClientId: this.config.clientId
        };

        if (this.config.cognito_idp_endpoint) {
            poolData.endpoint = this.config.cognito_idp_endpoint;
        }
        this.userPool = new CognitoUserPool(poolData);
    }

    public getConfig(): CognitoServiceConfig {
        return this.config;
    }

    public getCurrentSession$(): Observable<CognitoUserSession> {
        return this.getSession$(this.userPool.getCurrentUser());
    }

    public getRefreshToken$(): Observable<CognitoRefreshToken> {
        return this.getCurrentSession$().pipe(
            map((session: CognitoUserSession) => session.getRefreshToken())
        );
    }

    public refreshSession$(refreshToken: CognitoRefreshToken): Observable<ICognitoUserSessionData> {
        return new Observable((observer: Observer<any>) => {
            const currentUser = this.userPool.getCurrentUser();
            currentUser.refreshSession(refreshToken, (err, session) => {
                if (err) {
                    console.log('getRefreshSession Error: ', err);
                    observer.error(err);
                }
                observer.next(session);
            });
        });
    }

    public isAuthenticated$(): Observable<boolean> {
        return this.getCurrentSession$().pipe(
            map((session: CognitoUserSession) => session && session.isValid() ? true : false),
            catchError(() => of(false))
        );
    }

    public authenticate$(username: string, password: string, mfaCode?: Subject<string> | string): Observable<AuthenticationState> {
        const authenticationDetails = new AuthenticationDetails({
            Username: username,
            Password: password
        });
        const cognitoUser = this.buildCognitoUser(username);

        return new Observable((observer: Observer<AuthenticationState>) => {
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: (session: CognitoUserSession, userConfirmationNecessary?: boolean) => {
                    observer.next(new AuthenticationSuccess(session, userConfirmationNecessary));
                },
                onFailure: function(err: any) {
                    const notFoundUser = err.code === 'UserNotFoundException' || err.name === 'UserNotFoundException';
                    const notAuthorized = err.code === 'NotAuthorizedException' || err.name === 'NotAuthorizedException';
                    const unknownError = !notFoundUser && !notAuthorized;
                    if (unknownError) {
                        observer.error(err);
                    }
                    if (notFoundUser) {
                        observer.next(new UserNotFound());
                    }
                    if (notAuthorized) {
                        observer.next(new NotAuthorized());
                    }
                },
                newPasswordRequired: (userAttributes: any, requiredAttributes: any) => {
                    observer.next(new NewPasswordRequired(userAttributes, requiredAttributes));
                },
                mfaRequired: function(challengeName: any, challengeParameters: any) {
                    if (typeof mfaCode === 'string') {
                        cognitoUser.sendMFACode(mfaCode, this);
                        observer.next(new MFARequired(challengeName, challengeParameters));
                    } else {
                        const sendMFA$ = mfaCode.pipe(
                            map(code => { cognitoUser.sendMFACode(code, this); })
                        );
                        sendMFA$.subscribe(() => {
                            observer.next(new MFARequired(challengeName, challengeParameters));
                        }, observer.error);
                    }
                },
                customChallenge: (challengeParameters: any) => {
                    observer.next(new CustomChallenge(challengeParameters));
                }
            });
        });
    }

    public forgotPassword$(username: string): Observable<ForgotPasswordState> {
        return new Observable((observer: Observer<ForgotPasswordState>) => {
            this.buildCognitoUser(username).forgotPassword({
                onSuccess: function(data: any) {
                    observer.next(new ForgotPasswordSuccess(data));
                },
                onFailure: (err: any) => {
                    const unknownError = !(err.code === 'UserNotFoundException' || err.name === 'UserNotFoundException');
                    if (unknownError) {
                        observer.error(err);
                    }
                    observer.next(new ForgotPasswordUserNotFound());
                },
                inputVerificationCode: function(data: any) {
                    observer.next(new InputVerificationCode(data));
                }
            });
        });
    }

    public confirmNewPassword$(email: string, verificationCode: string, newPassword: string): Observable<ForgotPasswordState> {
        return new Observable((observer: Observer<ForgotPasswordState>) => {
            this.buildCognitoUser(email).confirmPassword(verificationCode, newPassword, {
                onSuccess: () => {
                    observer.next(new ForgotPasswordSuccess('Matched Code'));
                },
                onFailure: (err: any) => {
                    const unknownError = !(err.code === 'CodeMismatchException' || err.name === 'CodeMismatchException');
                    if (unknownError) {
                        observer.error(err);
                    }
                    observer.next(new CodeMismatch());
                },
            });
        });
    }

    public logout(): void {
        const cognitoUser = this.userPool.getCurrentUser();
        if (cognitoUser !== null) {
            cognitoUser.signOut();
        }

        if (AWS.config.credentials && AWS.config.credentials.hasOwnProperty('clearCachedId')) {
            // to clear cache for re-login
            const cognitoParams = { IdentityPoolId: this.config.identityPoolId };
            (AWS.config.credentials as any).clearCachedId();
            AWS.config.credentials = new AWS.CognitoIdentityCredentials(cognitoParams);
        }
    }

    public register$(user: any): Observable<ISignUpResult> {
        const attributeList = [];
        for (const key in user) {
            if (key === 'password') {
                continue;
            }
            const userAttribute = {
                Name: key,
                Value: user[key]
            };
            attributeList.push(new CognitoUserAttribute(userAttribute));
        }
        const signUp: Function = bindNodeCallback<ISignUpResult>(this.userPool.signUp.bind(this.userPool));
        return signUp(user.email, user.password, attributeList, null);
    }

    public confirmRegistration$(username: string, confirmationCode: string): Observable<any> {
        const cognitoUser = this.buildCognitoUser(username);
        const confirmRegistration: Function = bindNodeCallback<any>(cognitoUser.confirmRegistration.bind(cognitoUser));
        return this.getSession$(cognitoUser).pipe(
            switchMap(() => confirmRegistration(confirmationCode, true)),
        );
    }

    public resendCode$(username: string): Observable<any> {
        const cognitoUser = this.buildCognitoUser(username);
        const resendCodeFunc: Function = bindNodeCallback<any>(cognitoUser.resendConfirmationCode.bind(cognitoUser));
        return this.getSession$(cognitoUser).pipe(
            switchMap(() => resendCodeFunc()),
        );
    }

    public newPassword$(oldPassword: string, newPassword: string): Observable<any> {
        const currentUser = this.userPool.getCurrentUser();
        const changePassword: Function = bindNodeCallback<any>(currentUser.changePassword.bind(currentUser));
        return this.getSession$(currentUser).pipe(
            switchMap(() => changePassword(oldPassword, newPassword)),
        );
    }

    public getUserAttributes$(): Observable<CognitoUserAttribute[]> {
        const cognitoUser = this.userPool.getCurrentUser();
        const attributesFunc = (user: CognitoUser | null) => () => bindNodeCallback<CognitoUserAttribute[]>(user.getUserAttributes.bind(user))();
        return this.getSession$(cognitoUser).pipe(
            concatMap(attributesFunc(cognitoUser)),
        );
    }

    private buildCognitoUser(username: string): CognitoUser {
        const userData = {
            Username: username,
            Pool: this.userPool
        };
        return new CognitoUser(userData);
    }

    private getSession$(cognitoUser: CognitoUser): Observable<CognitoUserSession> {
        // N.B. cognitoUser.getSession return valid session or refresh it
        if (!cognitoUser) {
            return throwError(new Error('No current User'));
        }
        const sessionFunc: Function = bindNodeCallback<CognitoUserSession>(cognitoUser.getSession.bind(cognitoUser));
        return sessionFunc();
    }
}
