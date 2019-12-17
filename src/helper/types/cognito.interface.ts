export interface CognitoServiceConfig {
    region: string;
    identityPoolId: string;
    userPoolId: string;
    clientId: string;
    cognito_idp_endpoint?: string;
    cognito_identity_endpoint?: string;
}
