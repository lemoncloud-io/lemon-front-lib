import { CognitoUserSession } from 'amazon-cognito-identity-js';

export enum AuthenticationStateType {
    Success,
    NewPasswordRequired,
    MFARequired,
    CustomChallenge,
    NotAuthorized,
    UserNotFound,
}

export interface State {
    type: AuthenticationStateType;
}

export interface AuthenticationState extends State {}

export class AuthenticationSuccess implements AuthenticationState {
    type = AuthenticationStateType.Success;

    constructor(public session: CognitoUserSession, public userConfirmationNecessary?: boolean) { }
}

export class NewPasswordRequired implements AuthenticationState {
    type = AuthenticationStateType.NewPasswordRequired;

    constructor(public userAttributes: any, public requiredAttributes: any) { }
}

export class MFARequired implements AuthenticationState {
    type = AuthenticationStateType.MFARequired;

    constructor(public challengeName: any, public challengeParameters: any) { }
}

export class CustomChallenge implements AuthenticationState {
    type = AuthenticationStateType.CustomChallenge;

    constructor(challengeParameters: any) { }
}

export class NotAuthorized implements AuthenticationState {
    type = AuthenticationStateType.NotAuthorized;

    constructor() { }
}

export class UserNotFound implements AuthenticationState {
    type = AuthenticationStateType.UserNotFound;

    constructor() { }
}
