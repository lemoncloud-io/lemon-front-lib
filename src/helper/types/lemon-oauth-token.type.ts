export interface LemonOAuthTokenResult {
    accountId: string;
    authId: string;
    credential: LemonCredentials;
    identityId: string;
    identityPoolId: string;
    identityToken: string;
    error?: any;
}

export interface LemonCredentials {
    AccessKeyId: string;
    SecretKey: string;
    Expiration?: string;
    SessionToken?: string;
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
