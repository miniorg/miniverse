declare module 'http-signature' {
  import { ClientRequest, IncomingMessage } from 'http';

  export function parseRequest(request: IncomingMessage): {};

  export function sign(request: ClientRequest, options: {
    readonly authorizationHeaderName?: 'Signature';
    readonly key: string;
    readonly keyId: string;
  }): boolean;

  export function verifySignature(parsedSignature: {}, pubkey: string): boolean;
}

declare module 'http-signature/lib/utils' {
  export class HttpSignatureError extends Error {
  }
}
