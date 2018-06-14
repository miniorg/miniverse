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

exports.up = (db, callback) => db.runSql(`CREATE TABLE statuses (
  id BIGINT PRIMARY KEY DEFAULT nextval('id_seq'),
  person_id BIGINT REFERENCES persons (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE announces (
  id BIGINT PRIMARY KEY REFERENCES statuses (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  object_id BIGINT REFERENCES notes (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE FUNCTION delete_status(
  id BIGINT,
  attributed_to_id BIGINT
) RETURNS VOID AS $$
  BEGIN
    IF EXISTS (SELECT FROM statuses WHERE statuses.id = $1 AND attributed_to_id = $2) THEN
      DELETE FROM statuses USING announces
        WHERE statuses.id = announces.id AND announces.object_id = $1;
      DELETE FROM statuses WHERE statuses.id = $1;
    END IF;
  END
$$ LANGUAGE plpgsql;

CREATE FUNCTION insert_announce(
  uri VARCHAR,
  actor_id BIGINT,
  object_id BIGINT
) RETURNS BIGINT AS $$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO statuses (person_id) VALUES ($2) RETURNING statuses.id INTO id;
    INSERT INTO announces (id, object_id) VALUES (id, $3);

    IF uri IS NOT NULL THEN
      INSERT INTO uris (id, uri) VALUES (id, $1);
    END IF;

    RETURN id;
  END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insert_note(
  uri VARCHAR,
  attributed_to_id BIGINT,
  content TEXT,
  mentions BIGINT[]
) RETURNS BIGINT AS $$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO statuses (person_id) VALUES ($2) RETURNING statuses.id INTO id;
    INSERT INTO notes (id, content) VALUES (id, $3);

    IF uri IS NOT NULL THEN
      INSERT INTO uris (id, uri) VALUES (id, $1);
    END IF;

    INSERT INTO mentions (note_id, href_id)
      SELECT id, unnest FROM unnest(mentions);

    RETURN id;
  END
$$ LANGUAGE plpgsql;

INSERT INTO statuses (id, person_id) SELECT id, attributed_to_id FROM notes;
ALTER TABLE notes ADD CONSTRAINT id FOREIGN KEY (id) REFERENCES statuses (id)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE notes DROP COLUMN attributed_to_id;
`, callback);
