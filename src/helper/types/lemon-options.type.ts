/**
 * default options for initializing service
 */
export interface LemonOptions {
    /**
     * project name
     */
    project: string;
    /**
     * endpoint url for authentication
     */
    oAuthEndpoint: string;
    /**
     * extra header for axios request
     */
    extraHeader?: any;
    /**
     * extra options for axios request
     */
    extraOptions?: any;
    /**
     * whether to add the x-lemon-identity to request header
     */
    shouldUseXLemonIdentity?: boolean;
}
