import * as CryptoJS from 'crypto-js';
import { SignaturePayload } from '../types/lemon-oauth-token.type';

export const createAsyncDelay = (duration: number) => {
    return new Promise<void>(resolve => setTimeout(() => resolve(), duration));
};

export const withRetries = (attempt: Function, nthTry: number, delay: number) => async (...args: any[]) => {
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
    const hash = CryptoJS.HmacSHA256(message, key);
    return CryptoJS.enc.Base64.stringify(hash);
};

export const calcSignature = (
    payload: SignaturePayload,
    current: string = new Date().toISOString(),
    userAgent: string = navigator.userAgent,
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
