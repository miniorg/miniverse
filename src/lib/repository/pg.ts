/*
  Copyright (C) 2019  Miniverse authors

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, version 3 of the License.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { AbortSignal } from 'abort-controller';
import {
  Connection as PgConnection,
  Pool as PgPool,
  PoolClient as PgPoolClient,
  PoolConfig,
  QueryConfig
} from 'pg';

interface Connection extends PgConnection {
  cancel(processID: number, secretKey: number): void;
  connect(port: number, host: string): void;
  connect(file: string): void;
  requestSsl(): void;
  readonly ssl: boolean;
}

interface Pool extends PgPool {
  options: Config;
}

interface PoolClient extends PgPoolClient {
  processID: number;
  secretKey: number;
}

export interface Config extends PoolConfig {
  host: string;
  port: number;
}

export default class {
  private canceller: Connection | null;
  private connectedCanceller: Promise<Connection> | null;
  private pool: Pool;

  constructor(config: Config) {
    this.canceller = null;
    this.connectedCanceller = null;
    this.pool = new PgPool(config) as Pool;
  }

  end() {
    if (this.canceller) {
      this.canceller.end();
    }

    return this.pool.end();
  }

  async query(
    config: QueryConfig | string,
    signal: AbortSignal,
    recover: (error: Error & { code?: string; name?: string }) => unknown
  ) {
    let cancelled = false;
    let queried = false;

    const client = await this.pool.connect() as PoolClient;

    const onaborted = () => {
      if (!this.connectedCanceller) {
        const { options } = this.pool;
        this.canceller = new PgConnection(options) as Connection;

        this.connectedCanceller = new Promise(function(
          this: Connection,
          resolve: (connection: Connection) => void,
          reject: () => void
        ) {
          this.on('connect', () => {
            if (this.ssl) {
              this.requestSsl();
            } else {
              resolve(this);
            }
          });

          this.once('error', reject);
          this.once('sslconnect', () => resolve(this));
        }.bind(this.canceller));

        this.canceller.once('end', () => {
          this.canceller = null;
          this.connectedCanceller = null;
        });
  
        if (options.host.includes('/')) {
          this.canceller.connect(options.host + '/.s.PGSQL.' + options.port);
        } else {
          this.canceller.connect(options.port, options.host);
        }
      }

      this.connectedCanceller.then(canceller => {
        if (!queried) {
          canceller.cancel(client.processID, client.secretKey);
          cancelled = true;
        }
      });
    };

    try {
      if (signal.aborted) {
        throw recover(Object.assign(
          new Error('Query aborted'),
          { name: 'AbortError' }));
      }

      signal.addEventListener('aborted', onaborted, true);

      const result = await client.query(config).catch(error => {
        if (error.code == '57014') {
          throw recover(Object.assign(
            new Error('Query aborted'),
            { name: 'AbortError' }));
        }

        throw recover(error);
      });

      queried = true;

      if (cancelled) {
        await client.query('SELECT pg_wait(9)').catch(async error => {
          if (error.code == '57014') {
            return;
          }

          const { pool } = this;
          this.pool = new PgPool(pool.options) as Pool;
          await pool.end();

          throw error;
        });
      }

      return result;
    } finally {
      client.release();
      signal.removeEventListener('aborted', onaborted);
    }
  }
}
