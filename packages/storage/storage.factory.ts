import { StorageService } from '../types/storage.service';

export class StorageFactory {
    static create<T extends StorageService>(className: { new (project): T }, project: string): T {
        return new className(project);
    }
}
