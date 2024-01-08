import { FECoreManager } from './fe-core.manager';

describe('Utils', () => {
    //
    // it('calcSignature()', async () => {
    //     const aws = IdentityFactory.create(AWSIdentity, { test: '123' });
    //     expect(aws._options.test).toEqual('123')
    // });

    it('FECoreManager()', async () => {
        const feCoreManager = new FECoreManager({ cloud: 'aws', project: 'test' });
        feCoreManager.createIdentityService();
        feCoreManager.createHttpService();
        // const identityService = feCoreManager.createIdentity();
        // const result = await identityService.isAuthenticated();
        // expect(result).toEqual(true);
        const api = feCoreManager
            .getAPIBuilder('GET', '/d1/test')
            .setParams({ test: 'test' })
            .setBody({ test: 'test' })
            .build();
        api.request();
    });
});
