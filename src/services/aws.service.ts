// ref: https://github.com/BrunoLemonnier/aws-cognito-angular-quickstart
import * as AWS from 'aws-sdk/global';
import { LoginsMap } from 'aws-sdk/clients/cognitoidentity';
import { ServiceConfigurationOptions } from 'aws-sdk/lib/service';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

import { CognitoService } from './cognito.service';
import { CognitoServiceConfig } from '../types/cognito.interface';

export class AWSCredsService {

    private loginUrl: string;
    private config: CognitoServiceConfig;

    constructor(private cognitoService: CognitoService) {
        this.config = this.cognitoService.getConfig();

        this.loginUrl = `cognito-idp.${this.config.region.toLowerCase()}.amazonaws.com/${this.config.userPoolId}`;
        if (this.config.cognito_idp_endpoint) {
            this.loginUrl = `${this.config.cognito_idp_endpoint}/${this.config.userPoolId}`;
        }

        AWS.config.region = this.config.region;
    }

    /*
     * Gets the existing credentials, refreshing them if they are not yet loaded or have expired.
     * This will not attempt to reload credentials when they are already loaded into the AWS.config.credentials object.
     */
    public getCredentials(): Promise<AWS.CognitoIdentityCredentials> {
        const shouldRefresh = AWS.config.credentials === null || (<AWS.Credentials> AWS.config.credentials).needsRefresh();
        if (shouldRefresh) {
            return this.cognitoService.getCurrentSession().then((session: CognitoUserSession) => {
                AWS.config.credentials = this.buildCognitoCreds(session);
                return this.getFreshCredentials();
            });
        }
        return this.getFreshCredentials();
    }

    // Gets the existing credentials, refreshing them if they are not yet loaded or have expired.
    private getFreshCredentials(): Promise<AWS.CognitoIdentityCredentials> {
        return new Promise((resolve, reject) => {
            (<AWS.Credentials> AWS.config.credentials).get((error) => {
                if (error) {
                    this.cognitoService.logout();
                    reject(error);
                }
                resolve(<AWS.CognitoIdentityCredentials> AWS.config.credentials);
            });
        });
    }

    private buildCognitoCreds(session: CognitoUserSession) {
        const logins: LoginsMap = {};
        logins[this.loginUrl] = session.getIdToken().getJwtToken();
        const params = {
            IdentityPoolId: this.config.identityPoolId, /* required */
            Logins: {
                [this.loginUrl]: session.getIdToken().getJwtToken()
            }
        };
        // optionally provide configuration to apply to the underlying service clients
        // if configuration is not provided, then configuration will be pulled from AWS.config
        const serviceConfigs = <ServiceConfigurationOptions>{ };
        if (this.config.cognito_identity_endpoint) {
            // The endpoint URI to send requests to. The default endpoint is built from the configured region.
            // The endpoint should be a string like 'https://{service}.{region}.amazonaws.com'.
            serviceConfigs.endpoint = this.config.cognito_identity_endpoint;
        }
        return new AWS.CognitoIdentityCredentials(params as any, serviceConfigs);
    }
}
