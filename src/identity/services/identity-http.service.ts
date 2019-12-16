import { SignedHttpService, RequiredHttpParameters } from '../../helper';
import { IdentityService } from './identity.service';

export class IdentityHttpService {

    constructor(private identityService: IdentityService,
                private httpService: SignedHttpService) {
    }

    public request(method: string = 'GET', endpoint: string, path: string, params: any = {}, body?: any): Promise<any> {
        const queryParams = { ...params };
        const bodyReq = body && typeof body === 'object' ? JSON.stringify(body) : body;
        const objParams: RequiredHttpParameters = { method, path, queryParams, bodyReq };

        return this.identityService.getCredentials()
            .then(() => this.httpService.request(endpoint, objParams));
    }
}
