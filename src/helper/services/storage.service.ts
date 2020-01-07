export class StorageService {

    private storage: Storage;
    private static PREFIX = 'LEMON_CREDENTIAL';

    constructor() {
        // TODO: add memory storage
        this.storage = window.localStorage;
    }

    public setValue(key: string, value: string) {
        this.storage.setItem(`${StorageService.PREFIX}.${key}`, value);
    }

    public getValue(key: string) {
        return this.storage.getItem(`${StorageService.PREFIX}.${key}`);
    }

    public removeValue(key: string) {
        this.storage.removeItem(`${StorageService.PREFIX}.${key}`);
    }
}

