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
import {
  Custom as CustomError,
  wrap as wrapErrors
} from '../../../lib/errors';
import ParsedActivityStreams, { TypeNotAllowed }
  from '../../../lib/parsed_activitystreams';
import Actor from '../../../lib/tuples/actor';
import Key from '../../../lib/tuples/key';
import Repository from '../../../lib/repository';
import { normalizeHost } from '../../../lib/tuples/uri';

interface Data {
  readonly body: string;
  readonly signature: { readonly keyId: string };
}

export default async function(repository: Repository, { data }: Job<Data>) {
  const { body, signature } = data;
  const owner = await Actor.fromKeyUri(repository, signature.keyId);

  if (!owner) {
    throw new CustomError('Inbox owner not found', 'error');
  }

  const key = new Key({ owner, repository });

  if (await key.verifySignature(signature)) {
    const { host } = new URL(signature.keyId);
    const normalizedHost = normalizeHost(host);
    const parsed = JSON.parse(body);
    const collection =
      new ParsedActivityStreams(repository, parsed, normalizedHost);

    const items = await collection.getItems();
    const errors = [] as Error[];

    await Promise.all(items.map(item => {
      if (item) {
        return item.act(owner).catch(error => {
          if (!(error instanceof TypeNotAllowed)) {
            errors.push(error);
          }
        });
      }

      errors.push(new CustomError('Unspecified item.', 'error'));
    }));

    if (errors.length) {
      throw wrapErrors(errors);
    }
  }
}
