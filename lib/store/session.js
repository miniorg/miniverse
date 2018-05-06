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

async function createSession(user) {
  user.inbox = [];
  this.set({ user });
}

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
  return crypto.subtle.digest('SHA-256', string);
}

/*
  > HMAC(key, str): Apply the HMAC keyed hash algorithm (defined in
  > [RFC2104]) using the octet string represented by "key" as the key
  > and the octet string "str" as the input string.  The size of the
  > result is the hash result size for the hash function in use.  For
  > example, it is 20 octets for SHA-1 (see [RFC3174]).
*/
function hmac(key, string) {
  return crypto.subtle.sign('HMAC', key, string);
}

/*
  > Hi(str, salt, i):
  >
  > U1   := HMAC(str, salt + INT(1))
  > U2   := HMAC(str, U1)

  > Ui-1 := HMAC(str, Ui-2)
  > Ui   := HMAC(str, Ui-1)

  > Hi := U1 XOR U2 XOR ... XOR Ui

  > where "i" is the iteration count, "+" is the string concatenation
  > operator, and INT(g) is a 4-octet encoding of the integer g, most
  > significant octet first.

  > Hi() is, essentially, PBKDF2 [RFC2898] with HMAC() as the
  > pseudorandom function (PRF) and with dkLen == output length of
  > HMAC() == output length of H().
*/
async function iterateHash(string, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw', string, 'PBKDF2', false, ['deriveKey']);

  return crypto.subtle.deriveKey({
    name: 'PBKDF2',
    salt,
    iterations,
    hash: 'SHA-256'
   }, key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

/*
  > XOR: Apply the exclusive-or operation to combine the octet string
  > on the left of this operator with the octet string on the right of
  > this operator.  The length of the output and each of the two
  > inputs will be the same for this use.
*/
function xor(buffer0, buffer1) {
  const array0 = new Int8Array(buffer0);
  const array1 = new Int8Array(buffer1);

  array1.forEach((byte, index) => array0[index] ^= byte);

  return array0;
}

export default {
  async signin(fetch, username, password) {
    const encoder = new TextEncoder;
    const encodedClientKeyMessage = encoder.encode('Client Key');
    const encodedServerKeyMessage = encoder.encode('Server Key');
    const encodedPassword = encoder.encode(password);
    const personResponse = await this.fetchPerson(fetch, username);
    const user = await personResponse.json();
    const saltResponse = await fetch('data:;base64,' + user['miniverse:salt']);
    const salt = await saltResponse.arrayBuffer();

    const asyncSaltedPassword = iterateHash(encodedPassword, salt, 16384);

    const asyncServerKey = asyncSaltedPassword
      .then(saltedPassword => hmac(saltedPassword, encodedServerKeyMessage))
      .then(buffer => crypto.subtle.importKey('raw', buffer, {
        name: 'HMAC', hash: 'SHA-256'
      }, false, ['verify']));

    const asyncClientKey = asyncSaltedPassword
      .then(saltedPassword => hmac(saltedPassword, encodedClientKeyMessage));

    const asyncHashedClientKey = asyncClientKey
      .then(clientKey => hash(clientKey))
      .then(buffer => crypto.subtle.importKey('raw', buffer, {
        name: 'HMAC', hash: 'SHA-256'
      }, true, ['sign']));

    const clientNonce = crypto.getRandomValues(new Uint8Array(64));
    const serverNonceUri = 'data:;base64,' + this.get('nonce');
    const serverNonceResponse = await fetch(serverNonceUri);
    const serverNonce = await serverNonceResponse.arrayBuffer();

    const { target: auth } = await new Promise((resolve, reject) => {
      const reader = new FileReader;

      reader.onerror = reject;
      reader.onloadend = resolve;

      reader.readAsArrayBuffer(new Blob([clientNonce, serverNonce, salt]));
    });

    const clientSignature = await hmac(await asyncHashedClientKey, auth.result);
    const clientProof = xor(clientSignature, await asyncClientKey);

    const response = await fetch('/api/signin', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Blob([clientNonce, serverNonce, clientProof, username])
    });

    const serverSignature = await response.arrayBuffer();

    const verified = await crypto.subtle.verify(
      'HMAC', await asyncServerKey, serverSignature, auth.result);

    if (!verified) {
      throw new Error;
    }

    createSession.call(this, user);
  },

  async signup(fetch, username, password) {
    const encoder = new TextEncoder;
    const salt = crypto.getRandomValues(new Uint8Array(64));
    const encodedPassword = encoder.encode(password);
    const saltedPassword = await iterateHash(encodedPassword, salt, 16384);
    const clientKey = await hmac(saltedPassword, encoder.encode('Client Key'));
    const serverKey = await hmac(saltedPassword, encoder.encode('Server Key'));
    const storedKey = await hash(clientKey);

    await fetch('/api/signup', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Blob([salt, serverKey, storedKey, username])
    });

    const personResponse = await this.fetchPerson(fetch, username);

    createSession.call(this, await personResponse.json());
  }
}
