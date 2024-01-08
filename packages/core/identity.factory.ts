import { IdentityService, LemonOptions } from './fe-core.manager';

export class IdentityFactory {
    static create<T extends IdentityService>(className: { new (object: LemonOptions): T }, object: LemonOptions): T {
        return new className(object);
    }
}
