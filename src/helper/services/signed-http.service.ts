import * as AWS from 'aws-sdk/global';

import { AxiosService } from './axios.service';
import { LoggerService } from './logger.service';

import { sigV4Client } from '../../vendor/sig-v4.service';

export interface RequiredHttpParameters {
    method: string;
    path?: string;
    queryParams?: any;
    bodyReq?: any;
}

export interface SignedHttpOptions {
    customHeader?: any;
    customOptions?: any;
}

export class SignedHttpService {

    private customHeader: any;
    private customOptions: any;
    private logger: LoggerService;

    constructor(options: SignedHttpOptions = {}) {
        const { customHeader, customOptions } = options;
        this.customHeader = customHeader ? { ...customHeader } : { 'Content-Type': 'application/json' };
        this.customOptions = customOptions ? { ...customOptions } : {};
        this.logger = new LoggerService();
    }

    request(endpoint: string, allParams: RequiredHttpParameters) {
        if (!endpoint) {
            throw new Error('@endpoint (string) is required!');
        }
        if (!allParams) {
            throw new Error('@allParams (RequiredHttpParameters) is required!');
        }

        return this.getSignedClient(endpoint)
            .then(signedClient => this.getSignedHeader(signedClient, allParams))
            .then(header => this.executeRequest(header, endpoint, allParams));
    }

    private getSignedClient(endpoint: string): Promise<any> {
        if (!endpoint) {
            throw new Error('@endpoint (string) is required!');
        }

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

            const hasNoSignedClient = (signedClient === null || signedClient === undefined);
            if (hasNoSignedClient) {
                this.logger.warn('signedClient is missing => Request without signing');
            }
            resolve(signedClient);
        });
    }

    private getSignedHeader(signedClient: any, params: RequiredHttpParameters): Promise<any> {
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

            const hasNoHeader = (header === null || header === undefined);
            if (hasNoHeader) {
                this.logger.warn('signedClient is missing => Request without signing');
                return resolve(null);
            }
            return resolve(header);
        });
    }

    private executeRequest(header: any, endpoint: string, objParams: RequiredHttpParameters) {
        // execute http request.
        const { method, path, queryParams, bodyReq } = objParams;
        const headers = header ? { ...header, ...this.customHeader } : { ...this.customHeader };
        const axiosService = new AxiosService({ headers, ...this.customOptions });
        switch (method.toUpperCase()) {
            case 'POST':
                return axiosService.post(endpoint + path, bodyReq, queryParams);
            case 'PUT':
                return axiosService.put(endpoint + path, bodyReq, queryParams);
            case 'DELETE':
                return axiosService.delete(endpoint + path, queryParams);
            case 'PATCH':
                return axiosService.patch(endpoint + path, bodyReq, queryParams);
            case 'GET':
            default:
                return axiosService.get(endpoint + path, queryParams);
        }
    }

    // refer: https://stackoverflow.com/a/23945027/5268806
    private extractHostname(url: string) {
        let hostname;
        // find & remove protocol (http, ftp, etc.) and get hostname
        if (url.indexOf("//") > -1) {
            hostname = url.split('/')[2];
        } else {
            hostname = url.split('/')[0];
        }
        // find & remove port number
        hostname = hostname.split(':')[0];
        // find & remove "?"
        hostname = hostname.split('?')[0];
        return hostname;
    }
}
