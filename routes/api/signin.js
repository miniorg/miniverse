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

import { raw } from 'body-parser';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { digest } from '../../lib/challenge';
import cookie from './_cookie';

const middleware = raw();

/*
  RFC 5802 - Salted Challenge Response Authentication Mechanism (SCRAM) SASL and GSS-API Mechanisms
  2.2.  Notation
  https://tools.ietf.org/html/rfc5802#section-2.2
  > H(str): Apply the cryptographic hash function to the octet string
  > "str", producing an octet string as a result.  The size of the
  > result depends on the hash result size for the hash function in
  > use.
*/
function hash(string) {
  const context = createHash('sha256');
  context.update(string);
  return context.digest();
}

/*
  > HMAC(key, str): Apply the HMAC keyed hash algorithm (defined in
  > [RFC2104]) using the octet string represented by "key" as the key
  > and the octet string "str" as the input string.  The size of the
  > result is the hash result size for the hash function in use.  For
  > example, it is 20 octets for SHA-1 (see [RFC3174]).
*/
function hmac(key, string) {
  const context = createHmac('sha256', key);
  context.update(string);
  return context.digest();
}

/*
  > XOR: Apply the exclusive-or operation to combine the octet string
  > on the left of this operator with the octet string on the right of
  > this operator.  The length of the output and each of the two
  > inputs will be the same for this use.
*/
function xor(a, b) {
  b.forEach((byte, index) => a[index] ^= byte);
}

export function post(request, response, next) {
  middleware(request, response, error => {
    if (error) {
      next(error);
      return;
    }

    const { body, repository } = request;
    const nonce = body.slice(0, 128);
    const serverNonce = body.slice(64, 128);
    const serverNonceDigest = digest(serverNonce);
    const clientProof = body.slice(128, 160);
    const username = body.slice(160);

    repository.selectChallengeByDigest(serverNonceDigest).then(
      async challenge => {
        if (!challenge) {
          response.sendStatus(401);
          return;
        }

        const person = await repository.selectLocalPersonByUsername(
          username.toString());

        const { salt, storedKey, serverKey } = await person.get();

        const auth = Buffer.concat([nonce, salt]);
        const clientKey = hmac(storedKey, auth);
        xor(clientKey, clientProof);

        if (!timingSafeEqual(hash(clientKey), storedKey)) {
          response.sendStatus(401);
          return;
        }

        await cookie(repository, person, response);
        response.send(hmac(serverKey, auth));
      }, next);
  });
}
