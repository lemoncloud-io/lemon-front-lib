export enum ForgotPasswordStateType {
    Success,
    InputVerificationCode,
    UserNotFound,
    CodeMismatch,
}

export interface ForgotPasswordState {
    type: ForgotPasswordStateType;
}

export class ForgotPasswordSuccess implements ForgotPasswordState {
    type = ForgotPasswordStateType.Success;

    constructor(data: any) { }
}

export class InputVerificationCode implements ForgotPasswordState {
    type = ForgotPasswordStateType.InputVerificationCode;

    constructor(data: any) { }
}

export class ForgotPasswordUserNotFound implements ForgotPasswordState {
    type = ForgotPasswordStateType.UserNotFound;

    constructor() { }
}

export class CodeMismatch implements ForgotPasswordState {
    type = ForgotPasswordStateType.CodeMismatch;

    constructor() { }
}
