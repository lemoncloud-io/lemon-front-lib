import * as AWS from 'aws-sdk/global';
import { Credentials } from 'aws-sdk/lib/credentials';

import sigV4Client from './sig-v4.service';
import { HttpService } from './http.service';

export class SocialAuthService {

    private credentials: Credentials;

    constructor(accessKeyId: string, secretKey: string, sessionToken?: string) {
        this.credentials = new AWS.Credentials(accessKeyId, secretKey, sessionToken);
        AWS.config.credentials = this.credentials;
    }

    public request(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams = { method, path, queryParams, bodyReq };

        return this.getCredentials()
            .then(() => this.getSignedClient(endpoint))
            .then(signedClient => this.getSignedHeader(signedClient, objParams))
            .then(header => this.executeRequest(header, endpoint, objParams));
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

            const isNoSignedClient = (signedClient === null || signedClient === undefined);
            if (isNoSignedClient) {
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

            const isNoHeader = (header === null || header === undefined);
            if (isNoHeader) {
                console.log('Warning: headers is missing');
                return resolve(null);
            }
            return resolve(header);
        });
    }

    private executeRequest(header: any, endpoint: any, objParams: any) {
        // execute http request.
        const { method, path, queryParams, bodyReq } = objParams;

        const headers = header ? header : { 'Content-Type': 'application/json' };
        const httpClient = new HttpService({ headers });
        switch (method.toUpperCase()) {
            case 'POST':
                return httpClient.post(endpoint + path, bodyReq, queryParams);
            case 'PUT':
                return httpClient.put(endpoint + path, bodyReq, queryParams);
            case 'DELETE':
                return httpClient.delete(endpoint + path, queryParams);
            case 'PATCH':
                return httpClient.patch(endpoint + path, bodyReq, queryParams);
            case 'GET':
            default:
                return httpClient.get(endpoint + path, queryParams);
        }
    }

    public getCredentials(): Promise<AWS.Credentials> {
        const shouldRefresh = AWS.config.credentials === null || (<AWS.Credentials> AWS.config.credentials).needsRefresh();
        if (shouldRefresh) {
            return this.credentials.refreshPromise().then(() => this.getFreshCredentials());
        }
        return this.getFreshCredentials();
    }

    private getFreshCredentials(): Promise<AWS.Credentials> {
        return new Promise((resolve, reject) => {
            (<AWS.Credentials> AWS.config.credentials).get((error) => {
                if (error) {
                    reject(error);
                }
                resolve(<AWS.Credentials> AWS.config.credentials);
            });
        });
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
