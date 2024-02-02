export interface LemonKMS {
    arn: string;
}

export interface LemonOAuthTokenResult {
    accountId: string;
    authId: string;
    credential: LemonCredentials;
    identityId: string;
    identityToken: string;
    identityPoolId?: string;
    error?: any;
    accessToken?: string;
}

export interface LemonCredentials {
    AccessKeyId: string;
    SecretKey: string;
    Expiration?: string;
    SessionToken?: string;
    hostKey?: string;
}

export interface LemonRefreshTokenResult {
    authId: string;
    accountId: string;
    identityId: string;
    credential: LemonCredentials;
}

export interface SignaturePayload {
    authId?: string;
    accountId?: string;
    identityId?: string;
    identityToken?: string;
}
