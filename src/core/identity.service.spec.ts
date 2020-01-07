import SpyInstance = jest.SpyInstance;
import * as AWS from 'aws-sdk/global';
import { IdentityService } from './identity.service';

describe('IdentityService', () => {

    const accessKeyId = 'MY_ACCESS_KEY_ID';
    const secretKey = 'MY_SECRET_KEY';
    const sessionToken = 'MY_SESSION_TOKEN';

    let identityService: IdentityService;

    beforeEach(() => {
        identityService = new IdentityService();
        identityService.logout();
    });

    it('buildCredentialsByToken() should create credentials', async () => {
        await identityService.buildCredentialsByToken(accessKeyId, secretKey, sessionToken);
        const result = AWS.config.credentials;

        const expectResult = new AWS.Credentials(accessKeyId, secretKey, sessionToken);
        expect(result).toEqual(expectResult);
    });

    it('getCredentials() should return credentials', async () => {
        // before login
        const result = await identityService.getCredentials();
        expect(result).not.toBeTruthy();

        // build Credentials
        await identityService.buildCredentialsByToken(accessKeyId, secretKey, sessionToken);
        const creds = AWS.config.credentials;
        const expectResult = new AWS.Credentials(accessKeyId, secretKey, sessionToken);
        expect(creds).toEqual(expectResult);

        // after login
        const result2 = await identityService.getCredentials();
        expect(result2.accessKeyId).toEqual(accessKeyId);
        expect(result2.sessionToken).toEqual(sessionToken);
    });

    it('isAuthenticated() should return boolean value', async () => {
        const spyHasNoCredentials: SpyInstance = jest.spyOn(IdentityService.prototype as any, 'hasNoCredentials');
        const result = await identityService.isAuthenticated();
        expect(result).toBeFalsy();
        expect(spyHasNoCredentials).toHaveBeenCalled();

        // create AWS Credentials
        await identityService.buildCredentialsByToken(accessKeyId, secretKey, sessionToken);
        await expect(identityService.isAuthenticated()).toBeTruthy();
        expect(spyHasNoCredentials).toHaveBeenCalled();
    });

    it('AWS.config.credentials should return null after logout', async () => {
        // set manually credentials
        AWS.config.credentials = { expired: false, accessKeyId, expireTime: new Date(), sessionToken, secretAccessKey: '' };
        identityService.logout();
        expect(AWS.config.credentials).toBeNull();
    });
});
