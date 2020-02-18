import SpyInstance = jest.SpyInstance;
import { AuthService } from './auth.service';
import { IdentityService } from './identity.service';
import { LemonOAuthTokenResult } from '../helper';
import { LemonCredentials } from '../helper/types/lemon-oauth-token.type';

describe('AuthService', () => {

    const accountId = 'imweb:lemonplus:steve@lemoncloud.io';
    const identityId = 'ap-northeast-2:f3bbc501-9a5f-4966-9d48-ca9585bb7594';                       // fixed! see DummyCognitoService()
    const authId = 'auth001';                                                                       // instant auth-id.
    const current = new Date(1580716957468).toISOString();
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.146 Whale/2.6.89.9 Safari/537.36';
    const token = {
        "!": "/oauth/imweb/authorize @30 Jan 2020 14:20:32 GMT",
        "accountId": "imweb:lemonplus:steve@lemoncloud.io",
        "identityPoolId": "ap-northeast-2:618ce9d2-3ad6-49df-b3b3-e248ea51425e",
        "identityId": "ap-northeast-2:f3bbc501-9a5f-4966-9d48-ca9585bb7594",
        "identityToken": "eyJraWQiOiJhcC1ub3J0aGVhc3QtMjEiLCJ0eXAiOiJKV1MiLCJhbGciOiJSUzUxMiJ9.eyJzdWIiOiJhcC1ub3J0aGVhc3QtMjpmM2JiYzUwMS05YTVmLTQ5NjYtOWQ0OC1jYTk1ODViYjc1OTQiLCJhdWQiOiJhcC1ub3J0aGVhc3QtMjo2MThjZTlkMi0zYWQ2LTQ5ZGYtYjNiMy1lMjQ4ZWE1MTQyNWUiLCJhbXIiOlsiYXV0aGVudGljYXRlZCIsIm9hdXRoLmxlbW9uY2xvdWQuaW8iLCJvYXV0aC5sZW1vbmNsb3VkLmlvOmFwLW5vcnRoZWFzdC0yOjYxOGNlOWQyLTNhZDYtNDlkZi1iM2IzLWUyNDhlYTUxNDI1ZTppbXdlYl9sZW1vbnBsdXM6c3RldmVAbGVtb25jbG91ZC5pbyJdLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbSIsImV4cCI6MTU4MDQ4MDQzMiwiaWF0IjoxNTgwMzk0MDMyfQ.a9qCzNgyfKhXkPsi44j2z-FEI3mRy5BXmHO5GLScwVS1J7bXJp6ZSI_1K2qgkEUGY4w6bFThGOSwugJbXyLi9g7HNz3S84phYrNb-JzUUBOR2EJT79n65dbPxPt3ADSQ0Rbf7aJatwc8f986-ngLacW-gPReWhtDMTny8hSTqX-470u3nJMp6rYyoai5Xv_haC24qjPNs01NZUYxqntUf_MsasfML80moRfIC51lnpY0GKK_Lod2MRAIbEi7ynH50k5H3huFGt06sCmxhTDOvgOSRlJFva75hqTmIOH-uq-EknoSFnUWMfyxlr2SQfz7b-lhTw5p1Q4bggUHWb5a3Q",
        "credential": {
            "AccessKeyId": "ASIARHYTUBQ5AUQOZJYU",
            "SecretKey": "r/pLJXdsnz0iQ/KWugPVAuLALTn265r+TyIxLL7v",
            "SessionToken": "IQoJb3JpZ2luX2VjEFYaDmFwLW5vcnRoZWFzdC0yIkgwRgIhAO1Ty8UUiauiIbWWZr8MzVbqL0Xg8OQnM1Pb0rooShuaAiEAjKNRvwERwb3LpxnurpVuT383y9tZZnMpaWdYbJMCq5Aq7gMI7///////////ARABGgwwODU0MDM2MzQ3NDYiDKJTfsPPAHNpaJ8ddirCA9fq7t+YJi4n3lunWpOEnFYmSTj9OdQoUB5XAmSfYWG68sTszPShJHBxxlkSiakRvBsjuqyL+hDTJ1YBPOMsF9p0q/VxOiltHv+qAM0ngpAjNLf0B1DMmPwoNCj5WAlLjmnSum2LwsYR7I0dzXmxv/Tmo/TpYSHpolrGHNZpoTZND2zccl8jY2NK9QAvLxja2wbCPDeWJpqoEsa+lRvY8kv6H4phuY8Ab5xA6JGArbG+bne0usHuR3mSGNO5wL9BuD36ZEW4KN1Mj6nRadF/feGG0nH4ujMZUulx5TJT1Pa88MmiqbpQmhfszM2P6Hy+b/pXYPtEKcP1IL8aTYbkemkbwd7jaGcCkNKep3GyXrKX9pqWJnQgHQ08GlcjurqAMuCnQf7LRiZ/tUUshQjPVe225xX1NxsGspUeh7pgxM1d0Ldpqt0nD2lb92ERAMkK2weq501/3MZPcJzCqzgCPXZZclJNzpwwBLdVk01tul7YPGPkw+nmicIC/TnAbcxJ9PM+7qDfHxE8WdEAo2c6O/+Hu+pcD+yEJsm268G7rLur1l/wqYgRWHAdPDFsJ6x4FfDc1kxxhVw+D9/aabLLAobuHTCwzMvxBTrKApsB7DTFvHkx+cuV21pOKo1QTvamaXdw9865hiNgY9mLbByKIvIQbDXiaez46uwqSGJkXr1kvRb7Oc7bdKDmmvhGFfnWF1m5nNHi+9JgHxRd77XcsBkKT9O3i2CplO0o6h7ZYjrd/j57606tg+ePVg8AfgXxi9kehZUK63d0PkJqtkbVu3qwO86xwCO5frYsDL3Xw60jFGAqV06IN+zb2vpH38iuJuO4VJfdu91BrCTpTMVZ80Cw3IYGA83jZIq8bmhTfhqrbSUgZr6En4sX18WPGWdC8SOIuaAGArIpJnIxVrDfeHwQl9QH+Lj4vsnXAukwCb1Gk+hNtNfLq05YCRr3BH5xmRn2jilrXgLMej8OyRwWgn5zO2gblKf9FZVuwqMxCJ+c+UnNhAuCzipTQRGn9uXP/S1nfIeY7+DNFGmG5HppqbuxIc3W7A==",
            "Expiration": "2020-01-30T15:20:32.000Z"
        }
    };

    const credential: LemonCredentials = {
        AccessKeyId: token.credential.AccessKeyId,
        SecretKey: token.credential.SecretKey,
        SessionToken: token.credential.SessionToken
    };

    const customToken: LemonOAuthTokenResult = {
        accountId: accountId,
        authId: authId,
        identityId: identityId,
        identityPoolId: token.identityPoolId,
        identityToken: token.identityToken,
        credential: credential,
    };

    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService({ project: 'LEMON', oAuthEndpoint: '' });
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

        const result = await authService.buildCredentialsByToken(customToken);
        expect(result.accessKeyId).toEqual(token.credential.AccessKeyId);
        expect(result.sessionToken).toEqual(token.credential.SessionToken);
        expect(result.expired).toBeDefined();

        expect(spyBuildCredentialsByToken).toHaveBeenCalledWith(customToken);
        expect(spyGetCredentials).toHaveBeenCalled();
    });

    it('logout() should call logout on IdentityService', async () => {
        const spyLogout: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'logout');
        await authService.logout();
        expect(spyLogout).toHaveBeenCalled();
    });

    it('request() should call request on IdentityService', async () => {
        const spyRequest: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'request');

        const method = 'GET';
        const endpoint = 'MY_SERVER';
        const path = '/';
        const param = {};
        const body = {};

        await expect(authService.request(method, endpoint, path, param, body)).rejects.toThrowError();
        expect(spyRequest).toHaveBeenCalledWith(method, endpoint, path, param, body);
    });

    it('requestWithCredentials() should call requestWithCredentials on IdentityService', async () => {
        const spyRequestWithCredentials: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'requestWithCredentials');

        const method = 'GET';
        const endpoint = 'MY_SERVER';
        const path = '/';
        const param = {};
        const body = {};

        await expect(authService.requestWithCredentials(method, endpoint, path, param, body)).rejects.toThrowError();
        expect(spyRequestWithCredentials).toHaveBeenCalledWith(method, endpoint, path, param, body);
    });
});
