import { AwsHttpService, AzureHttpService, HttpService, HttpServiceFactory } from './http.factory';
import { IdentityFactory } from './identity.factory';
import { AxiosRequestConfig } from 'axios';

export interface CloudIdentity {
    isAuthenticated(): Promise<boolean>;
    request(): void;
}

export interface Options {
    test: string;
}

export class AWSIdentity implements CloudIdentity {
    _options: Options;

    constructor(options: Options) {
        this._options = options;
    }

    isAuthenticated(): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }
    request(): void {}
}

export class AzureIdentity implements CloudIdentity {
    isAuthenticated(): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }
    request(): void {}
}

// export class IdentityFactory {
//     static create<T extends CloudIdentity>(
//         className: { new(object: unknown): T },
//         object: unknown
//     ): T {
//         return new className(object);
//     }
// }

/////

const CLOUD_TYPES = {
    AWS: 'aws',
    AZURE: 'azure',
} as const;
export type CloudType = (typeof CLOUD_TYPES)[keyof typeof CLOUD_TYPES];
//
// export type AWSOptions<T extends CloudType> = {
//     cloud: T,
//     project: string;
// };
//
// export type AzureOptions<T extends CloudType> = {
//     cloud: T,
//     name: string;
// };
//
// export type LemonOptionsData<T extends CloudType>
//     = T extends 'aws' ? AWSOptions<T>
//     : T extends 'azure' ? AzureOptions<T>
//     : unknown
// export type LemonOptions = LemonOptionsData<CloudType>;
//
//
// export interface FECoreService {
//     isAuthenticated(): Promise<boolean>;
// }
//
// export class AWSManager implements FECoreService {
//     _options: CloudOptions;
//     constructor(options: CloudOptions) {
//         this._options = options;
//     }
//     async isAuthenticated(): Promise<boolean> {
//         return false;
//     }
// }
// export class AzureManager implements FECoreService {
//     _options: CloudOptions;
//     constructor(options: CloudOptions) {
//         this._options = options;
//     }
//     async isAuthenticated(): Promise<boolean> {
//         return false;
//     }
// }
//
//
// export type FECore<T extends CloudType>
//     = T extends 'aws' ? AWSManager
//     : T extends 'azure' ? AzureManager
//         : unknown
// export class FECoreManagerFactory {
//     static create<T extends CloudIdentity>(
//         type: CloudType,
//         options: CloudOptions,
//     ): FECore<T> {
//         switch (type) {
//             case 'aws':
//                 return new AWSManager(options);
//             case 'azure':
//                 return new AzureManager(options);
//             default:
//                 throw new Error("Invalid logger type.");
//         }
//     }
// }

export abstract class IdentityService {
    /** options for identity service */
    private lemonOptions: LemonOptions;

    /**
     * initializes a new identity service
     *
     * @param options - lemon options
     */
    protected constructor(options: LemonOptions) {
        this.lemonOptions = options;
    }

    /**
     * set lemon options
     *
     * @param options - new lemon options
     * @returns void
     */
    setLemonOptions(options: LemonOptions) {
        this.lemonOptions = options;
    }

    /**
     * returns the current lemon options
     * @returns LemonOptions
     */
    getLemonOptions(): LemonOptions {
        return this.lemonOptions;
    }

    /**
     * Checks if user is authenticated
     *
     * @returns Promises that is authenticated
     * @async
     */
    abstract isAuthenticated(): Promise<boolean>;
}

export class AwsIdentityService extends IdentityService {
    constructor(options: LemonOptions) {
        super(options);
    }

    isAuthenticated(): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }
}

export class AzureIdentityService extends IdentityService {
    constructor(options: LemonOptions) {
        super(options);
    }

    isAuthenticated(): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }
}

export interface LemonOptions {
    project: string;
    cloud: CloudType;
    extraHeader?: any;
    extraOptions?: Omit<AxiosRequestConfig, 'headers'>;
    shouldUseXLemonIdentity?: boolean;
}

export class FECoreManager {
    private lemonOptions: LemonOptions;
    private identityService: IdentityService;
    private httpService: HttpService;

    constructor(options: LemonOptions) {
        this.lemonOptions = options;
    }

    createIdentityService() {
        switch (this.lemonOptions.cloud) {
            case 'aws':
                this.identityService = IdentityFactory.create(AwsIdentityService, this.lemonOptions);
                return;
            case 'azure':
                this.identityService = IdentityFactory.create(AzureIdentityService, this.lemonOptions);
                return;
            default:
                throw new Error(`Invalid cloud type: ${this.lemonOptions.cloud}`);
        }
    }

    createHttpService() {
        switch (this.lemonOptions.cloud) {
            case 'aws':
                this.httpService = HttpServiceFactory.create(AwsHttpService);
                return;
            case 'azure':
                this.httpService = HttpServiceFactory.create(AzureHttpService);
                return;
            default:
                throw new Error(`Invalid cloud type: ${this.lemonOptions.cloud}`);
        }
    }

    setLemonOptions(options: LemonOptions) {
        this.lemonOptions = options;
    }

    getAPIBuilder(method: string, url: string) {
        return new APIBuilder(method, url);
    }
}

class APIBuilder {
    url: string;
    method: string;
    body: any;
    params: any;
    header: any;

    constructor(method: string, url: string) {
        this.method = method;
        this.url = url;
    }

    setParams(params) {
        this.params = params;
        return this;
    }

    setBody(body) {
        this.body = body;
        return this;
    }

    setHeader(header) {
        this.header = header;
        return this;
    }

    build() {
        return new API(this);
    }
}

class API {
    private url: string;
    private method: string;

    private body: any;
    private header: any;

    constructor(builder: APIBuilder) {
        this.url = builder.url;
        this.method = builder.method;
        this.body = builder.body;
        this.header = builder.header;
    }

    request() {
        return `${this.url}, ${this.method}, ${this.body}, ${this.header}`;
    }
}
