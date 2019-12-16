import * as AWS from 'aws-sdk/global';
import { Credentials } from 'aws-sdk/lib/credentials';

export class IdentityService {

    private credentials: Credentials;

    constructor(accessKeyId: string, secretKey: string, sessionToken?: string) {
        this.credentials = new AWS.Credentials(accessKeyId, secretKey, sessionToken);
        AWS.config.credentials = this.credentials;
    }

    public getCredentials(): Promise<AWS.Credentials | null> {
        if (!AWS.config.credentials) {
            return new Promise((resolve) => resolve(null));
        }

        const shouldRefresh = (<AWS.Credentials> AWS.config.credentials).needsRefresh();
        if (shouldRefresh) {
            return this.credentials.refreshPromise().then(() => this.getFreshCredentials());
        }
        return this.getFreshCredentials();
    }

    public isAuthenticated(): Promise<boolean> {
        return new Promise((resolve) => {
            (<AWS.Credentials> AWS.config.credentials).get((error) => {
                const isAuthenticated = error ? false : true;
                resolve(isAuthenticated);
            });
        });
    }

    public logout(): void {
        AWS.config.credentials = null;
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
}
