// for polyfill on IE11
import 'whatwg-fetch';

// services
export * from './services/aws.service';
export * from './services/cognito-http.service';
export * from './services/cognito.service';
export * from './services/http.service';
export * from './services/sig-v4.service';
export * from './services/core.service';

// types
export * from './types/cognito.interface';
export * from './types/authentication-state.type';
export * from './types/forgot-password-state.type';
