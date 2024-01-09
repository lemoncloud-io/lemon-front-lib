import { FECoreOptions } from './index';

export abstract class IdentityService {
    /** options for identity service */
    private options: FECoreOptions;

    /**
     * initializes a new identity service
     *
     * @param options - lemon options
     */
    protected constructor(options: FECoreOptions) {
        this.options = options;
    }

    /**
     * Checks if user is authenticated
     *
     * @returns Promises that is authenticated
     * @async
     */
    abstract isAuthenticated(): Promise<boolean>;
}
