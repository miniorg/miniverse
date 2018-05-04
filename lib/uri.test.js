/*
  Copyright (C) 2018  Akihiko Odaki <nekomanma@pixiv.co.jp>

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

import URI from './uri';

/*
  RFC 3986 - Uniform Resource Identifier (URI): Generic Syntax
  3.3 Path
  https://tools.ietf.org/html/rfc3986#section-3.3
*/
describe('encodeSegment', () => {
  for (const [decoded, encoded] of [
    ['//', '%2F%2F'], ['??', '%3F%3F'], ['##', '%23%23']
  ]) {
    test(`encodes ${decoded} to ${encoded}`, () =>
      expect(URI.encodeSegment(decoded)).toBe(encoded));
  }

  for (const character of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~!$&\'()*+,;=:@') {
    test(`does not encode ${character}`, () =>
      expect(URI.encodeSegment(character)).toBe(character));
  }
});

/*
  RFC 7565 - The 'acct' URI Scheme
  7. IANA Considerations
  https://tools.ietf.org/html/rfc7565#section-7
*/
describe('encodeAcctUserpart', () => {
  for (const [decoded, encoded] of [[':', '%3A'], ['@', '%40']]) {
    test(`encodes ${decoded} to ${encoded}`, () =>
      expect(URI.encodeAcctUserpart(decoded)).toBe(encoded));
  }

  for (const character of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~!$&\'()*+,;=') {
    test(`does not encode ${character}`, () =>
      expect(URI.encodeAcctUserpart(character)).toBe(character));
  }
});

describe('normalizeHost', () => {
  test('encodes in IDNA', () =>
    expect(URI.normalizeHost('إختبار')).toBe('xn--kgbechtv'));

  test('replaces uppercase ASCII characters with lowercase characters', () =>
    expect(URI.normalizeHost('EXAMPLE.COM')).toBe('example.com'));
});
