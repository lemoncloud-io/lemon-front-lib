import * as CryptoJS from 'crypto-js';

export class UtilsService {

    hmac(message: string, key: string) {
        /// base64, sha256
        const hash = CryptoJS.HmacSHA256(message, key);
        const base64Hash = CryptoJS.enc.Base64.stringify(hash);
        return base64Hash;
    }
}
