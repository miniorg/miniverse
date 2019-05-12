declare module '@sapper/app' {
  function start(options: { target: HTMLElement }): void;
}

declare module '@sapper/server' {
  import { Handler, Request, Response } from 'express';
  import Session from 'src/lib/session/types';

  function middleware(options: {
    session(request: Request, response: Response): Session;
  }): Handler;
}
