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

exports.up = (db, callback) => db.runSql(`ALTER SEQUENCE persons_id_seq RENAME TO uri_ids_id_seq;
CREATE TABLE uri_ids (
  id BIGINT NOT NULL PRIMARY KEY DEFAULT nextval('uri_ids_id_seq')
);
ALTER SEQUENCE uri_ids_id_seq OWNED BY uri_ids.id;

ALTER TABLE uris RENAME TO old_uris;
CREATE TABLE uris (
  uri VARCHAR UNIQUE
) INHERITS (uri_ids);

ALTER TABLE persons RENAME TO old_persons;
CREATE TABLE persons (
  username VARCHAR NOT NULL,
  host VARCHAR NOT NULL
) INHERITS (uri_ids);

ALTER TABLE cookies DROP CONSTRAINT person_id;

ALTER TABLE notes RENAME TO old_notes;
CREATE TABLE notes (
  attributed_to_id INT NOT NULL,
  content VARCHAR NOT NULL
) INHERITS (uris);
INSERT INTO notes (uri, attributed_to_id, content) SELECT NULL, attributed_to_id, content FROM old_notes;
DROP TABLE old_notes;

ALTER TABLE follows DROP CONSTRAINT actor_id;
ALTER TABLE follows DROP CONSTRAINT object_id;

CREATE TABLE local_persons (
  admin BOOLEAN NOT NULL,
  private_key_pem VARCHAR NOT NULL,
  salt BYTEA NOT NULL,
  server_key BYTEA NOT NULL,
  stored_key BYTEA NOT NULL
) INHERITS (persons);
INSERT INTO local_persons (
  id, username,
  host, admin,
  private_key_pem, salt,
  server_key, stored_key
) SELECT
    old_persons.id, old_persons.username,
    old_persons.host, local_accounts.admin,
    local_accounts.private_key_pem, local_accounts.salt,
    local_accounts.server_key, local_accounts.stored_key
  FROM old_persons
  JOIN local_accounts ON old_persons.id = local_accounts.person_id;
DROP TABLE local_accounts;

CREATE TABLE remote_persons (
  inbox_uri VARCHAR NOT NULL,
  key_uri VARCHAR NOT NULL UNIQUE,
  public_key_pem VARCHAR NOT NULL
) INHERITS (persons, uris);
INSERT INTO remote_persons (
  id, username,
  host, inbox_uri,
  key_uri, public_key_pem
) SELECT
    old_persons.id, old_persons.username,
    old_persons.host, remote_accounts.inbox_uri,
    remote_accounts.key_uri, remote_accounts.public_key_pem
  FROM old_persons
  JOIN remote_accounts ON old_persons.id = remote_accounts.person_id;
DROP TABLE remote_accounts;

DROP TABLE old_persons;
CREATE UNIQUE INDEX persons_acct ON persons (lower(host), username);

DROP TABLE old_uris;

DROP FUNCTION insert_local_account;
DROP FUNCTION insert_remote_account;
`, callback);

exports._meta = { version: 1 };
