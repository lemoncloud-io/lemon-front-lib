// for polyfill on IE11
import 'whatwg-fetch';

export * from './helper';
export * from './core';
// NOTE: cognito service should be deleted after accounts-api updated
export * from './cognito';
