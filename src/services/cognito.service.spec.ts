import { CognitoService } from './cognito.service';

describe('Cognito', () => {

    let cognitoService: CognitoService;

    const options = {
        host: 'api.eureka.deals',
        region: 'ap-northeast-2',
        identityPoolId: 'ap-northeast-2:f523f459-860a-456c-aafe-cd26999c4626', // Eureka Identity Pool
        userPoolId: 'ap-northeast-2_FD7tDusCs', // eureka-user-pool
        clientId: '297afu2njla9kev9f6rt4h4156', // eureka-front-web
    };

    beforeEach(() => {
        cognitoService = new CognitoService(options);
    });

    it('getConfig() should return options',  () => {
        const result = cognitoService.getConfig();
        expect(result).toEqual(options);
    });

    it('getCurrentSession() should return Error before login',  done => {
        cognitoService.getCurrentSession().catch((err) => {
            const NO_CURRENT_USER = 'No current User';
            expect(err.message).toEqual(NO_CURRENT_USER);
            done();
        });
    });

    it('getRefreshToken() should return Error before login',  done => {
        cognitoService.getRefreshToken().catch((err) => {
            const NO_CURRENT_USER = 'No current User';
            expect(err.message).toEqual(NO_CURRENT_USER);
            done();
        });
    });

    it('isAuthenticated() should return Error before login',  done => {
        cognitoService.isAuthenticated().then(isAuthenticated => {
            expect(isAuthenticated).toBeFalsy();
            done();
        });
    });
});
