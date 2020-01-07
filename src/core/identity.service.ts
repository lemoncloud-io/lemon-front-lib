import * as AWS from 'aws-sdk/global';
import { Credentials } from 'aws-sdk/lib/credentials';
import { RequiredHttpParameters, SignedHttpService } from '../helper/services/signed-http.service';

export class IdentityService {

    private credentials: Credentials | null = null;

    constructor() {
    }

    public buildCredentialsByToken(accessKeyId: string, secretKey: string, sessionToken?: string): void {
        if (!accessKeyId) {
            throw new Error('@accessKeyId (string) is required!');
        }
        if (!secretKey) {
            throw new Error('@secretKey (string) is required!');
        }

        this.credentials = new AWS.Credentials(accessKeyId, secretKey, sessionToken);
        AWS.config.credentials = this.credentials;
    }

    public requestWithSign(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        return this.getCredentials().then(() => {
            const httpService = new SignedHttpService();
            return httpService.request(endpoint, objParams);
        });
    }

    public getCredentials(): Promise<AWS.Credentials | null> {
        if (this.hasNoCredentials()) {
            return new Promise((resolve) => resolve(null));
        }

        const credentials = (<AWS.Credentials> AWS.config.credentials);
        const shouldRefresh = credentials.needsRefresh();
        if (shouldRefresh) {
            return credentials.refreshPromise().then(() => this.getCurrentCredentials());
        }
        return this.getCurrentCredentials();
    }

    public isAuthenticated(): Promise<boolean> {
        if (this.hasNoCredentials()) {
            return new Promise((resolve) => resolve(false));
        }

        return new Promise((resolve) => {
            (<AWS.Credentials> AWS.config.credentials).get((error) => {
                const isAuthenticated = error ? false : true;
                resolve(isAuthenticated);
            });
        });
    }

    public logout(): void {
        this.credentials = null;
        AWS.config.credentials = null;
    }

    private getCurrentCredentials(): Promise<AWS.Credentials> {
        return new Promise((resolve, reject) => {
            const credentials = (<AWS.Credentials> AWS.config.credentials);
            credentials.get((error) => {
                if (error) {
                    reject(error);
                }
                this.credentials = <AWS.Credentials> AWS.config.credentials;
                resolve(this.credentials);
            });
        });
    }

    private hasNoCredentials(): boolean {
        return this.credentials === null;
    }
}