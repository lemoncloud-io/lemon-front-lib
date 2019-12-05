import { CognitoService} from './cognito.service';
import { CognitoHttpService } from './cognito-http.service';
import { AWSCredsService } from './aws.service';

import { CognitoServiceConfig } from '../types/cognito.interface';

export class CoreService {

    private readonly cognitoService: CognitoService;
    private readonly cognitoHttpService: CognitoHttpService;
    private readonly awsCredsService: AWSCredsService;

    constructor(config: CognitoServiceConfig) {
        this.cognitoService = new CognitoService(config);
        this.cognitoHttpService = new CognitoHttpService(this.cognitoService);
        this.awsCredsService = new AWSCredsService(this.cognitoService);
    }

    // AWS Credentials
    public getCognitoIdentityCredentials$() {
        return this.awsCredsService.getCredentials();
    }

    // Cognito Http
    public doSignedRequest$(method: string = 'GET', endpoint: string, path: string, params?: any, body?: any) {
        return this.cognitoHttpService.request$(method, endpoint, path, params, body);
    }

    // Cognito Service
    public getCognitoInstance() {
        return this.cognitoService;
    }

}
