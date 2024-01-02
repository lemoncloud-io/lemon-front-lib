import { AxiosRequestConfig } from 'axios';

export type Cloud = 'aws' | 'azure';

/**
 * default options for initializing service
 */
export interface LemonOptions {
    /**
     * project name
     */
    project: string;
    /**
     * target cloud
     */
    cloud: Cloud;
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
    extraOptions?: Omit<AxiosRequestConfig, 'headers'>;
    /**
     * whether to add the x-lemon-identity to request header
     */
    shouldUseXLemonIdentity?: boolean;
}
