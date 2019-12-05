import * as AWS from 'aws-sdk/global';
import { CognitoRefreshToken } from 'amazon-cognito-identity-js';
import { Observable, Observer, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { CognitoService } from '../services/cognito.service';

import sigV4Client from './sig-v4.service';
import { HttpService } from './http.service';
import { CognitoServiceConfig } from '../types/cognito.interface';

export class CognitoHttpService {

    private config: CognitoServiceConfig;

    constructor(private cognitoService: CognitoService) {
        this.config = this.cognitoService.getConfig();
    }

    public request$(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any): Observable<any> {
        const queryParams = params || {};
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams = { method, path, queryParams, bodyReq };
        const hasNeedsRefresh = AWS.config.credentials && 'needsRefresh' in AWS.config.credentials;
        const needsRefresh = hasNeedsRefresh
            ? (<AWS.Credentials> AWS.config.credentials).needsRefresh()
            : false;

        // observable chain for request with signed header
        return of(needsRefresh).pipe(
            // refresh session and credentials
            switchMap(shouldRefresh => shouldRefresh ? this.refreshSessionAndCredentials$() : of(true)),
            // prepare signed header
            switchMap(() => this.getSignedClient$(endpoint)),
            switchMap(signedClient => this.getSignedHeader$(signedClient, objParams)),
            switchMap(header => this.executeRequest$(header, endpoint, objParams))
        );
    }

    private refreshSessionAndCredentials$() {
        // https://github.com/aws-amplify/amplify-js/issues/446#issuecomment-375304763 참고
        return this.cognitoService.getRefreshToken().pipe(
            switchMap((refreshToken: CognitoRefreshToken) => this.cognitoService.refreshSession(refreshToken)),
            switchMap((session: any) => this.doRefreshCredentials$(session))
        );
    }

    private doRefreshCredentials$(newSession: any) {
        return new Observable((observer: Observer<boolean>) => {
            const { region, userPoolId } = this.config;
            const loginUrl = `cognito-idp.${region.toLowerCase()}.amazonaws.com/${userPoolId}`;
            const globalAWSCredentials: any = <AWS.Credentials>AWS.config.credentials;

            globalAWSCredentials.params.Logins[loginUrl] = newSession.getIdToken().getJwtToken();
            globalAWSCredentials.refresh((err: any) => {
                if (err) {
                    console.log('doRefreshCredentials error', err);
                    observer.error(err);
                } else {
                    console.log('TOKEN SUCCESSFULLY UPDATED');
                    observer.next(true);
                }
            });
        });
    }

    private getSignedClient$(endpoint: string) {
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
        return of(signedClient);
    }

    private getSignedHeader$(signedClient: any, params: any) {
        if (!signedClient) {
            return of(null);
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
            return of(null);
        }
        return of(header);
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
