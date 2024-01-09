import { FECoreOptions, IdentityService } from '../types';

export class IdentityFactory {
    static create<T extends IdentityService>(className: { new (object: FECoreOptions): T }, object: FECoreOptions): T {
        return new className(object);
    }
}
