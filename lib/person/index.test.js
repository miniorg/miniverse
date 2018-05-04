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

import LocalAccount from '../local_account';
import Person from './index';

describe('constructor', () => {
  test('assigns itself to its account\'s person property if present', () => {
    const account = new LocalAccount;
    const person = new Person({ account });

    expect(account.person).toBe(person);
  });

  test('works without account property', () => {
    new Person;
  });
});

describe('validate', () => {
  test('does not throw an error if username does not include @', () => {
    const person = new Person({ username: '' });
    expect(() => person.validate()).not.toThrow();
  });

  test('throws an error if username includes @', () => {
    const person = new Person({ username: '@' });
    expect(() => person.validate()).toThrow();
  });
});

describe('getUri', () => {
});
