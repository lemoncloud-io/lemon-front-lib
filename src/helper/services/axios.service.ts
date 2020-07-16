import axios, { AxiosInstance, AxiosRequestConfig, AxiosPromise, Method, AxiosResponse } from 'axios';

export class AxiosService {

    private options: AxiosRequestConfig;
    private axiosInstance: AxiosInstance;

    constructor(private requestOptions: AxiosRequestConfig = {}) {
        this.options = requestOptions;
        this.axiosInstance = axios.create();
    }

    public get<T>(url: string, queryParams?: object) {
        return this.makeRequest<T>('GET', url, queryParams);
    }

    public post<T>(url: string, body: object, queryParams?: object) {
        return this.makeRequest<T>('POST', url, queryParams, body);
    }

    public put<T>(url: string, body: object, queryParams?: object) {
        return this.makeRequest<T>('PUT', url, queryParams, body);
    }

    public patch<T>(url: string, body: object, queryParams?: object) {
        return this.makeRequest<T>('PATCH', url, queryParams, body);
    }

    public delete(url: string, queryParams?: object) {
        return this.makeRequest('DELETE', url, queryParams);
    }

    private makeRequest<T>(method: Method, url: string, queryParams?: object, body?: object) {
        let request: AxiosPromise<T>;

        switch (method) {
            case 'GET':
                request = this.axiosInstance.get<T>(url, { params: queryParams, ...this.options });
                break;
            case 'POST':
                request = this.axiosInstance.post<T>(url, body, { params: queryParams, ...this.options });
                break;
            case 'PUT':
                request = this.axiosInstance.put<T>(url, body, { params: queryParams, ...this.options });
                break;
            case 'PATCH':
                request = this.axiosInstance.patch<T>(url, body, { params: queryParams, ...this.options });
                break;
            case 'DELETE':
                request = this.axiosInstance.delete(url, { params: queryParams, ...this.options });
                break;
            default:
                throw new Error('Method not supported');
        }

        return new Promise((resolve, reject) => {
            request.then((response: AxiosResponse) => resolve(response.data))
                .catch((err: Error) => reject(err));
        });
    }
}
