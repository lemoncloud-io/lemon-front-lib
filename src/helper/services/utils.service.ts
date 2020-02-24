import * as CryptoJS from 'crypto-js';

export interface SignaturePayload {
    authId?: string;
    accountId?: string;
    identityId?: string;
    identityToken?: string;
}

export class UtilsService {

    calcSignature(payload: SignaturePayload, current: string = new Date().toISOString(), userAgent: string = navigator.userAgent) {
        const authId = payload.authId || '';
        const accountId = payload.accountId || '';
        const identityId = payload.identityId || '';
        const identityToken = payload.identityToken || '';

        //! build payload to sign......
        const data = [current, accountId, identityId, identityToken, userAgent].join('&');
        //! make signature with auth-id
        const hmac = (data: string, sig: string) => this.hmac(data, sig);
        const signature = hmac(hmac(hmac(data, authId), accountId), identityId);
        //! returns signature..........
        // return new Buffer(signature).toString('base64');
        return signature;
    }

    private hmac(message: string, key: string) {
        //! INFO: lemon-account-api
        //! algorithm: sha256, encoding: base64
        const hash = CryptoJS.HmacSHA256(message, key);
        const base64Hash = CryptoJS.enc.Base64.stringify(hash);
        return base64Hash;
    }
}
