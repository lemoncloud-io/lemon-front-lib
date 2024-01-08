export interface HttpService {
    request(): Promise<any>;
}

export class AwsHttpService implements HttpService {
    async request() {
        return false;
    }
}

export class AzureHttpService implements HttpService {
    async request() {
        return true;
    }
}

export class HttpServiceFactory {
    static create<T extends HttpService>(className: { new (): T }): T {
        return new className();
    }
}
