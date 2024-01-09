const CLOUD_TYPES = {
    AWS: 'aws',
    AZURE: 'azure',
} as const;
export type CloudType = (typeof CLOUD_TYPES)[keyof typeof CLOUD_TYPES];

export interface FECoreOptions {
    project: string;
    cloud: CloudType;
    // extraHeader?: any;
    // extraOptions?: Omit<AxiosRequestConfig, 'headers'>;
    // shouldUseXLemonIdentity?: boolean;
}

export * from './identity.service';

export interface LemonOAuthTokenResult {
    accountId: string;
    authId: string;
    credential: LemonCredentials;
    identityId: string;
    identityToken: string;
    identityPoolId?: string;
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
