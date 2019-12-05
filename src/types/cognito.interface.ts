export interface CognitoServiceConfig {
    region: string;
    identityPoolId: string;
    userPoolId: string;
    clientId: string;
    cognito_idp_endpoint?: string;
    cognito_identity_endpoint?: string;
}

export interface ChallengeParameters {
    CODE_DELIVERY_DELIVERY_MEDIUM: string;
    CODE_DELIVERY_DESTINATION: string;
}
