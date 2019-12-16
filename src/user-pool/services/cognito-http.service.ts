import * as AWS from 'aws-sdk/global';
import { CognitoRefreshToken, ICognitoUserSessionData } from 'amazon-cognito-identity-js';

import { CognitoServiceConfig } from '../types/cognito.interface';
import { CognitoService } from './cognito.service';
import { SignedHttpService, RequiredHttpParameters } from '../../helper';

export class CognitoHttpService {

    private config: CognitoServiceConfig;

    constructor(private cognitoService: CognitoService,
                private httpService: SignedHttpService) {
        this.config = this.cognitoService.getConfig();
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
            .then(() => this.httpService.request(endpoint, objParams));
    }

    private refreshSessionAndCredentials() {
        // https://github.com/aws-amplify/amplify-js/issues/446#issuecomment-375304763 참고
        return this.cognitoService.getRefreshToken()
            .then((refreshToken: CognitoRefreshToken) => this.cognitoService.refreshSession(refreshToken))
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
