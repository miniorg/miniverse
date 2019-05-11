declare module 'bull-arena' {
  import { RequestHandler } from 'express';
  import { RedisOptions } from 'ioredis';

  function Arena(
    config: {
      queues: ({
        host: string;
        port?: string;
        password?: string;
        db?: number;
      } | {
        url?: string;
      } | {
        redis?: RedisOptions;
      } & {
        name: string;
        hostId: string;
        type?: null | string;
        prefix?: string;
      })[];
    },
    listenOpts: {
      port?: number;
      host?: string;
      basePath?: string;
      disableListen?: boolean;
      useCdn?: boolean;
    }): RequestHandler;

  export = Arena;
}
