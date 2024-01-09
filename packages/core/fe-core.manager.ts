import { FECoreOptions } from '../types';
import { IdentityService } from '../types';
import { AWSIdentityService } from '../identity/aws-identity.service';
import { AzureIdentityService } from '../identity/azure-identity.service';
import { IdentityFactory } from '../identity/identity.factory';
import { AxiosRequestConfig } from 'axios';
import { StorageService } from '../types/storage.service';
import { StorageFactory } from '../storage/storage.factory';
import { AWSStorageService } from '../storage/aws-storage.service';
import { AzureStorageService } from '../storage/azure-storage.service';
// export class IdentityFactory {
//     static create<T extends CloudIdentity>(
//         className: { new(object: unknown): T },
//         object: unknown
//     ): T {
//         return new className(object);
//     }
// }

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

export class FECoreManager {
    private options: FECoreOptions;
    private identityService: IdentityService;
    private storageService: StorageService;

    constructor(options: FECoreOptions) {
        this.options = options;
    }

    createService() {
        this.createIdentityService();
        this.createStorageService();
    }

    setOptions(options: FECoreOptions): void {
        this.options = options;
        // TODO: reset service?
    }

    getAPIBuilder(method: string, url: string): APIBuilder {
        // const httpService = new HttpService(this.identityService, this.storageService);
        return new APIBuilder(this.identityService, method, url);
    }

    isAuthenticated(): Promise<boolean> {
        return this.identityService.isAuthenticated();
    }

    private createIdentityService(): void {
        switch (this.options.cloud) {
            case 'aws':
                this.identityService = IdentityFactory.create(AWSIdentityService, this.options);
                return;
            case 'azure':
                this.identityService = IdentityFactory.create(AzureIdentityService, this.options);
                return;
            default:
                throw new Error(`Invalid cloud type: ${this.options.cloud}`);
        }
    }

    private createStorageService(): void {
        if (!this.options.project) {
            throw new Error(`Invalid project: ${this.options.project}`);
        }

        const { project } = this.options;
        switch (this.options.cloud) {
            case 'aws':
                this.storageService = StorageFactory.create(AWSStorageService, project);
                return;
            case 'azure':
                this.storageService = StorageFactory.create(AzureStorageService, project);
                return;
            default:
                throw new Error(`Invalid cloud type: ${this.options.cloud}`);
        }
    }
}

class APIBuilder {
    url: string;
    method: string;
    body: any;
    params: any;
    header: any;
    options: Omit<AxiosRequestConfig, 'headers'>;

    private readonly identityService: IdentityService;

    constructor(identityService: IdentityService, method: string, url: string) {
        this.identityService = identityService;
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

    setOptions(options: Omit<AxiosRequestConfig, 'headers'>) {
        this.options = options;
        return this;
    }

    build() {
        // TODO: request
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
