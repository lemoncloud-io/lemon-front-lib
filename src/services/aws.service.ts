// ref: https://github.com/BrunoLemonnier/aws-cognito-angular-quickstart
import * as AWS from 'aws-sdk/global';
import * as CognitoIdentity from 'aws-sdk/clients/cognitoidentity';
import * as awsService from 'aws-sdk/lib/service';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

import { Observable, Observer } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { CognitoService, CognitoServiceConfig } from './cognito.service';

export class AWSCredsService {

    private loginUrl: string;

    constructor(private cognitoService: CognitoService) {
        const config: CognitoServiceConfig = environment;

        this.loginUrl = 'cognito-idp.' + config.region.toLowerCase() + '.amazonaws.com/' + config.userPoolId;
        if (config.cognito_idp_endpoint) {
            this.loginUrl = config.cognito_idp_endpoint + '/' + config.userPoolId;
        }

        AWS.config.region = config.region;
    }

    /*
     * Gets the existing credentials, refreshing them if they are not yet loaded or have expired.
     * This will not attempt to reload credentials when they are already loaded into the AWS.config.credentials object.
     */
    getCredentials(): Observable<AWS.CognitoIdentityCredentials> {
        if (AWS.config.credentials == null || (<AWS.Credentials> AWS.config.credentials).needsRefresh()) {
            return this.cognitoService.getCurrentSession().pipe(
                concatMap((session: CognitoUserSession) => {
                    AWS.config.credentials = this.buildCognitoCreds(session);
                    return this.getFreshCredentials();
                })
            );
        } else {
            return this.getFreshCredentials();
        }

    }
    // Gets the existing credentials, refreshing them if they are not yet loaded or have expired.
    private getFreshCredentials(): Observable<AWS.CognitoIdentityCredentials> {
        return new Observable((observer: Observer<AWS.CognitoIdentityCredentials>) => {
            (<AWS.Credentials> AWS.config.credentials).get((error) => {
                if (error) {
                    this.cognitoService.logout();
                    observer.error(error);
                } else {
                    observer.next(<AWS.CognitoIdentityCredentials> AWS.config.credentials);
                }
            });
        });
    }

    private buildCognitoCreds(session: CognitoUserSession) {
        const logins: CognitoIdentity.LoginsMap = {};
        logins[this.loginUrl] = session.getIdToken().getJwtToken();
        const params = {
            IdentityPoolId: environment.identityPoolId, /* required */
            Logins: {
                [this.loginUrl]: session.getIdToken().getJwtToken()
            }
        };
        // optionally provide configuration to apply to the underlying service clients
        // if configuration is not provided, then configuration will be pulled from AWS.config
        const serviceConfigs = <awsService.ServiceConfigurationOptions>{};
        if (environment.cognito_identity_endpoint) {
            // The endpoint URI to send requests to. The default endpoint is built from the configured region.
            // The endpoint should be a string like 'https://{service}.{region}.amazonaws.com'.
            serviceConfigs.endpoint = environment.cognito_identity_endpoint;
        }
        return new AWS.CognitoIdentityCredentials(params as any, serviceConfigs);
    }
}
