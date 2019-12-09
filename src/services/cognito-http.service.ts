import * as AWS from 'aws-sdk/global';
import { CognitoRefreshToken } from 'amazon-cognito-identity-js';

import sigV4Client from './sig-v4.service';
import { HttpService } from './http.service';
import { CognitoService } from './cognito.service';

import { CognitoServiceConfig } from '../types/cognito.interface';

export class CognitoHttpService {

    private config: CognitoServiceConfig;

    constructor(private cognitoService: CognitoService) {
        this.config = this.cognitoService.getConfig();
    }

    public request$(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Promise<any> {
        const queryParams = params || {};
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams = { method, path, queryParams, bodyReq };
        const hasNeedsRefresh = AWS.config.credentials && 'needsRefresh' in AWS.config.credentials;
        const needsRefresh = hasNeedsRefresh
            ? (<AWS.Credentials> AWS.config.credentials).needsRefresh()
            : false;

        // observable chain for request with signed header
        return new Promise((resolve) => resolve(needsRefresh))
            .then((shouldRefresh: boolean) => shouldRefresh ? this.refreshSessionAndCredentials() : new Promise(resolve => resolve(true)))
            .then(() => this.getSignedClient(endpoint))
            .then(signedClient => this.getSignedHeader(signedClient, objParams))
            .then(header => this.executeRequest$(header, endpoint, objParams));
    }

    private refreshSessionAndCredentials() {
        // https://github.com/aws-amplify/amplify-js/issues/446#issuecomment-375304763 참고
        return this.cognitoService.getRefreshToken()
            .then((refreshToken: CognitoRefreshToken) => this.cognitoService.refreshSession(refreshToken))
            .then((session: any) => this.doRefreshCredentials(session));
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
                } else {
                    console.log('TOKEN SUCCESSFULLY UPDATED');
                    resolve(true);
                }
            });
        });
    }

    private getSignedClient(endpoint: string): Promise<any> {
        return new Promise((resolve) => {
            // prepare client
            const ok = AWS.config && AWS.config.credentials;
            const signedClient = ok && sigV4Client.newClient({
                accessKey: AWS.config.credentials.accessKeyId,
                secretKey: AWS.config.credentials.secretAccessKey,
                sessionToken: AWS.config.credentials.sessionToken,
                region: 'ap-northeast-2',
                endpoint: endpoint,
                host: this.extractHostname(endpoint)
            });

            const isError = (signedClient === null || signedClient === undefined);
            if (isError) {
                console.log('Warning: signedClient is missing -> request without header');
            }
            resolve(signedClient);
        });
    }

    private getSignedHeader(signedClient: any, params: any): Promise<any> {
        return new Promise((resolve) => {
            if (!signedClient) {
                return resolve(null);
            }

            const { method, path, queryParams, bodyReq } = params;
            // check signRequest instance.
            const signedRequest = signedClient.signRequest({
                method: method,
                path: path,
                headers: {},
                queryParams: queryParams,
                body: bodyReq
            });
            const header = signedRequest && signedRequest.headers;

            const isError = (header === null || header === undefined);
            if (isError) {
                console.log('Warning: headers is missing');
                return resolve(null);
            }
            return resolve(header);
        });
    }

    private executeRequest$(header: any, endpoint: any, objParams: any) {
        // execute http request.
        const { method, path, queryParams, bodyReq } = objParams;

        const headers = header ? header : { 'Content-Type': 'application/json' };
        const httpClient = new HttpService({ headers });
        switch (method.toUpperCase()) {
            case 'POST':
                return httpClient.post$(endpoint + path, bodyReq, queryParams);
            case 'PUT':
                return httpClient.put$(endpoint + path, bodyReq, queryParams);
            case 'DELETE':
                return httpClient.delete$(endpoint + path, queryParams);
            case 'PATCH':
                return httpClient.patch$(endpoint + path, bodyReq, queryParams);
            case 'GET':
            default:
                return httpClient.get$(endpoint + path, queryParams);
        }
    }

    // refer: https://stackoverflow.com/a/23945027/5268806
    private extractHostname(url: string) {
        let hostname;
        //find & remove protocol (http, ftp, etc.) and get hostname
        if (url.indexOf("//") > -1) {
            hostname = url.split('/')[2];
        } else {
            hostname = url.split('/')[0];
        }
        //find & remove port number
        hostname = hostname.split(':')[0];
        //find & remove "?"
        hostname = hostname.split('?')[0];
        return hostname;
    }
}
