import { SignaturePayload } from '../types/lemon-oauth-token.type';
import hmacSHA256 from 'crypto-js/hmac-sha256.js';
import encBase64 from 'crypto-js/enc-base64.js';

export const createAsyncDelay = (duration: number) => {
    return new Promise<void>(resolve => setTimeout(() => resolve(), duration));
};

export const withRetries =
    (attempt: any, nthTry: number, delay: number) =>
    async (...args: any[]) => {
        let retryCount = 0;
        do {
            try {
                return await attempt(...args);
            } catch (error) {
                const isLastAttempt = retryCount === nthTry;
                if (isLastAttempt) {
                    return Promise.reject(error);
                }
            }
            await createAsyncDelay(delay);
        } while (retryCount++ < nthTry);
    };

export const hmac = (message: string, key: string) => {
    //! INFO: lemon-account-api
    //! algorithm: sha256, encoding: base64
    const hash = hmacSHA256(message, key);
    return encBase64.stringify(hash);
};

export const calcSignature = (
    payload: SignaturePayload,
    current: string = new Date().toISOString(),
    userAgent: string = navigator.userAgent
) => {
    const authId = payload.authId || '';
    const accountId = payload.accountId || '';
    const identityId = payload.identityId || '';
    const identityToken = '';

    //! build payload to sign......
    const data = [current, accountId, identityId, identityToken, userAgent].join('&');
    //! make signature with auth-id
    const signature = hmac(hmac(hmac(data, authId), accountId), identityId);
    //! returns signature..........
    // return new Buffer(signature).toString('base64');
    return signature;
};
