# lemon-front-lib [![build status](https://github.com/lemoncloud-io/lemon-front-lib/workflows/build/badge.svg)](https://github.com/lemoncloud-io/lemon-front-lib/actions) [![npm package](https://img.shields.io/npm/v/@lemoncloud/lemon-front-lib.svg)](https://www.npmjs.com/package/@lemoncloud/lemon-front-lib)

Core JS library for [Lemoncloud](https://lemoncloud.io); written by Typescript

## Install

```
$ npm install @lemoncloud/lemon-front-lib
// or
$ yarn add @lemoncloud/lemon-front-lib
```

## Usage

```typescript
import { AuthService } from '@lemoncloud/lemon-front-lib';

const oAuthEndpoint = 'http://localhost:8086'; // refresh 때 필요
const project = 'LEMON';
const authService = new AuthService({ project, oAuthEndpoint });
````

### Authentication

#### buildCredentialsByToken()
`oauth api`를 통해 발급 받은 token으로 AWS Credentials 생성

```typescript
const ENDPOINT = 'https://..../oauth/kakao/token'; // lemoncloud oauth-api
const body = { code }; // get from kakao, naver, google...

const credentials = authService.requestWithSign('POST', ENDPOINT, '/', {}, body)
    .then(data => authService.buildCredentialsByToken(data));
```

#### isAuthenticated()
AWS Credentials 데이터 유무로 로그인 체크

```typescript
AuthService.isAuthenticated();
```

#### getCredentials()
AWS Credentials 리턴. 로그인하지 않았을 경우 `null` 리턴

```typescript
AuthService.getCredentials();
```

#### request()
`axios`를 이용한 HTTP 요청. AWS Credentials이 있을 경우, Signature V4 Signing 과정을 거쳐 요청

```typescript
AuthService.request('GET', 'YOUR_URL', '/');
AuthService.request('GET', 'YOUR_URL', '/', { page: 0 });
AuthService.request('POST', 'YOUR_URL', '/', {}, { mock: 'MOCK_VALUE' });
```

#### requestWithCredentials()
내부에서 `getCredentials()`을 호출 후 `request()` 진행

```typescript
AuthService.requestWithCredentials('GET', 'YOUR_URL', '/');
AuthService.requestWithCredentials('GET', 'YOUR_URL', '/', { page: 0 });
AuthService.requestWithCredentials('POST', 'YOUR_URL', '/', {}, { mock: 'MOCK_VALUE' });
```

#### logout()
AWS Credentials 데이터 삭제

```typescript
AuthService.logout();
```

## Example

```
$ node example/example.js
# open localhost:8888 on browser
```
