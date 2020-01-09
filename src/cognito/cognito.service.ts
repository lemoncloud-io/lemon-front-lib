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

import { CognitoServiceConfig } from '../helper/types/cognito.interface';
import {
    AuthenticationState,
    AuthenticationSuccess,
    UserNotFound,
    NotAuthorized,
    NewPasswordRequired,
    MFARequired,
    CustomChallenge,
} from '../helper/types/authentication-state.type';
import {
    CodeMismatch,
    ForgotPasswordState,
    ForgotPasswordSuccess,
    ForgotPasswordUserNotFound,
    InputVerificationCode,
} from '../helper/types/forgot-password-state.type';

import { RequiredHttpParameters, SignedHttpService } from '../helper/services/signed-http.service';

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

    public request(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        // check should refresh session
        const hasNeedsRefreshProperty = AWS.config.credentials && 'needsRefresh' in AWS.config.credentials;
        const needsRefresh = hasNeedsRefreshProperty
            ? (<AWS.Credentials> AWS.config.credentials).needsRefresh()
            : false;

        // observable chain for request with signed header
        return new Promise((resolve) => resolve(needsRefresh))
            .then((shouldRefresh: boolean) => shouldRefresh ? this.refreshSessionAndCredentials() : new Promise(resolve => resolve(true)))
            .then(() => {
                const httpService = new SignedHttpService();
                return httpService.request(endpoint, objParams);
            });
    }

    public getCurrentSession(): Promise<CognitoUserSession> {
        return this.getSession(this.userPool.getCurrentUser());
    }

    public getRefreshToken(): Promise<CognitoRefreshToken> {
        return this.getCurrentSession().then((session: CognitoUserSession) => session.getRefreshToken());
    }

    public refreshSession(refreshToken: CognitoRefreshToken): Promise<ICognitoUserSessionData> {
        return new Promise((resolve, reject) => {
            const currentUser = this.userPool.getCurrentUser();
            currentUser.refreshSession(refreshToken, (err, session) => {
                if (err) {
                    console.error('getRefreshSession Error: ', err);
                    reject(err);
                }
                resolve(session);
            });
        });
    }

    public isAuthenticated(): Promise<boolean> {
        return this.getCurrentSession()
            .then((session: CognitoUserSession) => session && session.isValid() ? true : false)
            .catch(() => false);
    }

    public authenticate(username: string, password: string, mfaCode?: string): Promise<AuthenticationState> {
        return new Promise((resolve, reject) => {
            const authenticationDetails = new AuthenticationDetails({ Username: username, Password: password });
            const cognitoUser = this.buildCognitoUser(username);

            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: (session: CognitoUserSession, userConfirmationNecessary?: boolean) => {
                    resolve(new AuthenticationSuccess(session, userConfirmationNecessary));
                },
                onFailure: (err: any) => {
                    const notFoundUser = err.code === 'UserNotFoundException' || err.name === 'UserNotFoundException';
                    const notAuthorized = err.code === 'NotAuthorizedException' || err.name === 'NotAuthorizedException';
                    const unknownError = !notFoundUser && !notAuthorized;
                    if (unknownError) {
                        console.error('authenticate error: ', err);
                        reject(err);
                    }
                    if (notFoundUser) {
                        resolve(new UserNotFound());
                    }
                    if (notAuthorized) {
                        resolve(new NotAuthorized());
                    }
                },
                newPasswordRequired: (userAttributes: any, requiredAttributes: any) => {
                    resolve(new NewPasswordRequired(userAttributes, requiredAttributes));
                },
                mfaRequired: function(challengeName: any, challengeParameters: any) {
                    cognitoUser.sendMFACode(mfaCode, this);
                    resolve(new MFARequired(challengeName, challengeParameters));
                },
                customChallenge: (challengeParameters: any) => {
                    resolve(new CustomChallenge(challengeParameters));
                }
            });
        });
    }

    public forgotPassword(username: string): Promise<ForgotPasswordState> {
        return new Promise((resolve, reject) => {
            this.buildCognitoUser(username).forgotPassword({
                onSuccess: (data: any) => {
                    resolve(new ForgotPasswordSuccess(data));
                },
                onFailure: (err: any) => {
                    const unknownError = !(err.code === 'UserNotFoundException' || err.name === 'UserNotFoundException');
                    if (unknownError) {
                        console.error('forgotPassword error: ', err);
                        reject(err);
                    }
                    resolve(new ForgotPasswordUserNotFound());
                },
                inputVerificationCode: (data: any) => {
                    resolve(new InputVerificationCode(data));
                }
            });
        });
    }

    public confirmNewPassword(email: string, verificationCode: string, newPassword: string): Promise<ForgotPasswordState> {
        return new Promise((resolve, reject) => {
            this.buildCognitoUser(email).confirmPassword(verificationCode, newPassword, {
                onSuccess: () => {
                    resolve(new ForgotPasswordSuccess('Matched Code'));
                },
                onFailure: (err: any) => {
                    const unknownError = !(err.code === 'CodeMismatchException' || err.name === 'CodeMismatchException');
                    if (unknownError) {
                        console.error('confirmNewPassword error: ', err);
                        reject(err);
                    }
                    resolve(new CodeMismatch());
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

    public register(user: any): Promise<ISignUpResult> {
        const attributeList: CognitoUserAttribute[] = [];
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
        return new Promise<ISignUpResult>((resolve, reject) => {
            const { email, password } = user;
            if (!email) {
                return reject(new Error('.email is required!'));
            }
            if (!password) {
                return reject(new Error('.password is required!'));
            }

            this.userPool.signUp(email, password, attributeList, null, (err, result) => {
                if (err) {
                    console.error('register error: ', err);
                    return reject(err);
                }
                resolve(result)
            });
        })
    }

    public confirmRegistration(username: string, confirmationCode: string): Promise<any> {
        const cognitoUser = this.buildCognitoUser(username);
        return this.getSession(cognitoUser)
            .then(() => {
                return new Promise((resolve, reject) => {
                    cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
                        if (err) {
                            console.error('confirmRegistration error: ', err);
                            return reject(err);
                        }
                        resolve(result);
                    });
                });
            });
    }

    public resendCode(username: string): Promise<'SUCCESS'> {
        const cognitoUser = this.buildCognitoUser(username);
        return this.getSession(cognitoUser).then(() => {
            return new Promise((resolve, reject) => {
                cognitoUser.resendConfirmationCode((err, result) => {
                    if (err) {
                        console.error('resendCode error: ', err);
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        });
    }

    public newPassword(oldPassword: string, newPassword: string): Promise<'SUCCESS'> {
        const currentUser = this.userPool.getCurrentUser();
        return this.getSession(currentUser).then(() => {
            return new Promise((resolve, reject) => {
                currentUser.changePassword(oldPassword, newPassword, (err, result: 'SUCCESS') => {
                    if (err) {
                        console.error('newPassword error: ', err);
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        });
    }

    public getUserAttributes(): Promise<CognitoUserAttribute[] | void> {
        const cognitoUser = this.userPool.getCurrentUser();
        return this.getSession(cognitoUser).then(() => {
            return new Promise((resolve, reject) => {
                cognitoUser.getUserAttributes((err, result) => {
                    if (err) {
                        console.error('getUserAttributes error: ', err);
                        return reject(err);
                    }
                    resolve(result);
                });
            })
        });
    }

    private buildCognitoUser(username: string): CognitoUser {
        const userData = {
            Username: username,
            Pool: this.userPool
        };
        return new CognitoUser(userData);
    }

    private getSession(cognitoUser: CognitoUser): Promise<CognitoUserSession> {
        return new Promise((resolve, reject) => {
            // N.B. cognitoUser.getSession return valid session or refresh it
            if (!cognitoUser) {
                return reject(new Error('No current User'));
            }
            cognitoUser.getSession((err: any, result: CognitoUserSession) => {
                if (err) {
                    console.error('getSession error: ', err);
                    return reject(err);
                }
                resolve(result);
            })
        });
    }

    private refreshSessionAndCredentials() {
        // https://github.com/aws-amplify/amplify-js/issues/446#issuecomment-375304763 참고
        return this.getRefreshToken()
            .then((refreshToken: CognitoRefreshToken) => this.refreshSession(refreshToken))
            .then((session: ICognitoUserSessionData) => this.doRefreshCredentials(session));
    }

    private doRefreshCredentials(newSession: any) {
        return new Promise((resolve, reject) => {
            const { region, userPoolId } = this.config;
            const loginUrl = `cognito-idp.${region.toLowerCase()}.amazonaws.com/${userPoolId}`;
            const globalAWSCredentials: any = <AWS.Credentials>AWS.config.credentials;

            globalAWSCredentials.params.Logins[loginUrl] = newSession.getIdToken().getJwtToken();
            globalAWSCredentials.refresh((err: any) => {
                if (err) {
                    console.log('doRefreshCredentials error', err);
                    reject(err);
                }
                console.log('TOKEN SUCCESSFULLY UPDATED');
                resolve(true);
            });
        });
    }
}
