import { FECoreOptions, IdentityService } from '../types';

export class AzureIdentityService extends IdentityService {
    constructor(options: FECoreOptions) {
        super(options);
    }

    isAuthenticated(): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }
}
