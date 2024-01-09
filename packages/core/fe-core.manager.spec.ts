import { FECoreManager } from './fe-core.manager';

describe('FECoreManager', () => {
    it('should be initialized()', async () => {
        const feCoreManager = new FECoreManager({ cloud: 'aws', project: 'test' });
        feCoreManager.createService();
        expect(feCoreManager).toBeDefined();
        const isAuth = await feCoreManager.isAuthenticated();
        expect(isAuth).toEqual(true);
        // const result = await identityService.isAuthenticated();
        // expect(result).toEqual(true);
        const api = feCoreManager
            .getAPIBuilder('GET', '/d1/test')
            .setParams({ test: 'test' })
            .setBody({ test: 'test' })
            .build();
        api.request();
    });

    it('should return isAuthenticated result', async () => {
        const feCoreManager = new FECoreManager({ cloud: 'aws', project: 'test' });
        feCoreManager.createService();
        const isAuth = await feCoreManager.isAuthenticated();
        expect(isAuth).toEqual(true);
    });

    it('should build APIBuilder', async () => {
        const feCoreManager = new FECoreManager({ cloud: 'aws', project: 'test' });
        feCoreManager.createService();

        const api = feCoreManager
            .getAPIBuilder('GET', '/d1/test')
            .setParams({ test: 'test' })
            .setBody({ test: 'test' })
            .build();
        const res = api.request();
        console.log(res);
    });
});
