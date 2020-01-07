import SpyInstance = jest.SpyInstance;
import { AuthService } from './auth.service';
import { IdentityService } from './identity.service';

describe('AuthService', () => {

    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
    });

    it('isAuthenticated() should return false before login', async () => {
        const spyIsAuthenticated: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'isAuthenticated');
        const result = await authService.isAuthenticated();
        expect(result).toBeFalsy();
        expect(spyIsAuthenticated).toHaveBeenCalled();
    });

    it('getCredentials() should return null before login', async () => {
        const spyGetCredentials: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'getCredentials');
        const result = await authService.getCredentials();
        expect(result).toBeNull();
        expect(spyGetCredentials).toHaveBeenCalled();
    });

    it('buildCredentialsByToken() should call buildCredentialsByToken() and return getCredentials() of IdentityService', async () => {
        const spyBuildCredentialsByToken: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'buildCredentialsByToken');
        const spyGetCredentials: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'getCredentials');

        const accessKeyId = 'MY_ACCESS_KEY_ID';
        const secretKey = 'MY_SECRET_KEY';
        const sessionToken = 'MY_SESSION_TOKEN';

        const result = await authService.buildCredentialsByToken(accessKeyId, secretKey, sessionToken);
        expect(result.accessKeyId).toEqual(accessKeyId);
        expect(result.sessionToken).toEqual(sessionToken);
        expect(result.expired).toBeDefined();

        expect(spyBuildCredentialsByToken).toHaveBeenCalledWith(accessKeyId, secretKey, sessionToken);
        expect(spyGetCredentials).toHaveBeenCalled();
    });

    it('logout() should call logout on IdentityService', async () => {
        const spyLogout: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'logout');
        await authService.logout();
        expect(spyLogout).toHaveBeenCalled();
    });


    it('requestWithSign() should call requestWithSign on IdentityService', async () => {
        const spyRequestWithSign: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'requestWithSign');

        const method = 'GET';
        const endpoint = 'MY_SERVER';
        const path = '/';
        const param = {};
        const body = {};

        await expect(authService.requestWithSign(method, endpoint, path, param, body)).rejects.toThrowError();
        expect(spyRequestWithSign).toHaveBeenCalledWith(method, endpoint, path, param, body);
    });
});
