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

import LocalPerson from '../local_person';

function parse({ username, admin, private_key_pem, salt, server_key, stored_key }) {
  return {
    username,
    host: null,
    admin,
    privateKeyPem: private_key_pem,
    salt,
    serverKey: server_key,
    storedKey: stored_key
  };
}

export default {
  getInboxChannel({ id }) {
    return `${this.redis.prefix}inbox:${id}:channel`;
  },

  async insertLocalPerson(person) {
    const { username, admin, privateKeyPem, salt, serverKey, storedKey } =
      await person.get();

    const { rows } = await this.pg.query({
      name: 'insertLocalPerson',
      text: 'INSERT INTO local_persons (username, host, admin, private_key_pem, salt, server_key, stored_key) VALUES ($1, \'\', $2, $3, $4, $5, $6) RETURNING id',
      values: [username, admin, privateKeyPem, salt, serverKey, storedKey]
    });

    person.id = rows[0].id;
  },

  async insertIntoInboxes(persons, item) {
    const message = await item.toActivityStreams();
    message['@context'] = 'https://www.w3.org/ns/activitystreams';

    const string = JSON.stringify(message);

    return this.redis
               .client
               .pipeline(persons.map(({ id }) => [
                 'zadd',
                 `${this.redis.prefix}inbox:${id}`,
                 item.id,
                 item.id
               ]).concat(persons.map(person => [
                 'publish',
                 this.getInboxChannel(person),
                 string
               ])))
               .exec();
  },

  async loadLocalPerson({ id }) {
    const { rows } = await this.pg.query({
        name: 'loadLocalPerson',
        text: 'SELECT * FROM local_persons WHERE id = $1',
        values: [id],
      });

    return parse(rows[0]);
  },

  async selectLocalPersonByDigestOfCookie(digest) {
    const { rows } = await this.pg.query({
      name: 'selectLocalPersonByDigestOfCookie',
      text: 'SELECT local_persons.* FROM local_persons JOIN cookies ON local_persons.id = cookies.person_id WHERE cookies.digest = $1',
      values: [digest]
    });

    return rows[0] ? new LocalPerson(this, rows[0].id, parse(rows[0])) : null;
  },

  async selectLocalPersonsByFollowee({ id }) {
    const { rows } = await this.pg.query({
      name: 'selectLocalPersonsByFollowee',
      text: 'SELECT local_persons.* FROM local_persons JOIN follows ON local_persons.id = follows.actor_id WHERE follows.object_id = $1',
      values: [id]
    });

    return rows.map(row => new LocalPerson(this, row.id, parse(row)));
  },

  async selectLocalPersonByUsername(username) {
    const { rows } = await this.pg.query({
      name: 'selectLocalPersonByUsername',
      text: 'SELECT * FROM local_persons WHERE username = $1 AND lower(host) = \'\'',
      values: [username]
    });

    return rows[0] ? new LocalPerson(this, rows[0].id, parse(rows[0])) : null;
  }
};
