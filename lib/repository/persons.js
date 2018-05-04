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

import Person from '../person';

export default {
  async loadPerson(person) {
    if (this.loadeds.has(person)) {
      return person;
    }

    const { rows: [ { username, host } ] } = await this.pg.query({
      name: 'loadPerson',
      text: 'SELECT * FROM persons WHERE id = $1',
      values: [person.id]
    });

    person.username = username;
    person.host = host || null;

    this.loadeds.add(person);

    return person;
  },

  async selectPersonByDigestOfCookie(digest) {
    const { rows } = await this.pg.query({
      name: 'selectPersonByDigestOfCookie',
      text: 'SELECT persons.* FROM persons JOIN cookies ON persons.id = cookies.person_id WHERE cookies.digest = $1',
      values: [digest]
    });

    if (rows[0]) {
      const person = new Person({
        id: rows[0].id,
        username: rows[0].username,
        host: rows[0].host
      });

      this.loadeds.add(person);
      return person;
    }

    return null;
  }
};
