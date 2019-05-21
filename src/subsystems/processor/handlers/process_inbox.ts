/*
  Copyright (C) 2018  Miniverse authors

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

import { Job } from 'bull';
import { URL } from 'url';
import ParsedActivityStreams from '../../../lib/parsed_activitystreams';
import { temporaryError } from '../../../lib/transfer';
import Actor from '../../../lib/tuples/actor';
import Key from '../../../lib/tuples/key';
import Repository from '../../../lib/repository';
import { normalizeHost } from '../../../lib/tuples/uri';

const ownerNotFound = Symbol('owner not found');

interface Data {
  readonly body: string;
  readonly signature: { readonly keyId: string };
}

export type OwnerNotFound = typeof ownerNotFound;

export default async function(repository: Repository, { data }: Job<Data>, recover: (error: Error & { [temporaryError]?: boolean }) => unknown) {
  const { body, signature } = data;
  const owner = await Actor.fromKeyUri(repository, signature.keyId, recover);

  if (!owner) {
    throw recover(new Error('Key owner not found.'));
  }

  const key = new Key({ owner, repository });

  if (await key.verifySignature(signature, recover)) {
    const { host } = new URL(signature.keyId);
    const normalizedHost = normalizeHost(host);
    const parsed = JSON.parse(body);
    const collection =
      new ParsedActivityStreams(repository, parsed, normalizedHost);

    const items = await collection.getItems(recover);
    const errors = [] as (Error & { [temporaryError]?: boolean })[];

    await Promise.all(items.map(item => {
      if (item) {
        return item.act(owner, recover).catch(error => {
          errors.push(error);
        });
      }

      errors.push(new Error('Unspecified item.'));
    }));

    if (errors.length) {
      throw errors.length == 1 ? errors[0] : {
        message: errors.map(({ message }) => message).join('\n'),
        stack: errors.map(({ stack }) => stack).join('\n\n'),
        [temporaryError]: errors.some(error => Boolean(error[temporaryError]))
      };
    }
  }
}
