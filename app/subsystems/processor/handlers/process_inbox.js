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

import { URL } from 'url';
import Actor from '../../../../lib/actor';
import Key from '../../../../lib/key';
import ParsedActivityStreams, { TypeNotAllowed }
  from '../../../../lib/parsed_activitystreams';
import TemporaryError from '../../../../lib/temporary_error';
import { normalizeHost } from '../../../../lib/uri';

export default async (repository, { data }) => {
  const { body, signature } = data;
  const owner = await Actor.resolveByKeyUri(repository, signature.keyId);
  const key = new Key({ owner, repository });

  if (await key.verifySignature(signature)) {
    const { host } = new URL(signature.keyId);
    const normalizedHost = normalizeHost(host);
    const parsed = JSON.parse(body);
    const collection =
      new ParsedActivityStreams(repository, parsed, normalizedHost);

    const items = await collection.getItems();
    const errors = [];

    await Promise.all(items.map(item => item.act(owner).catch(error => {
      if (!(error instanceof TypeNotAllowed)) {
        errors.push(error);
      }
    })));

    if (errors.length) {
      const error = new (
        errors.some(error => error instanceof TemporaryError) ?
          TemporaryError : Error)(errors.join());

      error.originals = errors;

      throw error;
    }
  }
};
