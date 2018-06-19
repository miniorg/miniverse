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

exports.up = (db, callback) => db.runSql(`ALTER TABLE notes ADD summary TEXT;
UPDATE notes SET summary = '';
ALTER TABLE notes ALTER summary SET NOT NULL;

DROP FUNCTION insert_note(VARCHAR, BIGINT, TEXT, BIGINT[]);
CREATE OR REPLACE FUNCTION insert_note(
  uri VARCHAR,
  attributed_to_id BIGINT,
  summary TEXT,
  content TEXT,
  mentions BIGINT[]
) RETURNS BIGINT AS $$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO statuses (person_id) VALUES ($2) RETURNING statuses.id INTO id;
    INSERT INTO notes (id, summary, content) VALUES (id, $3, $4);

    IF $1 IS NOT NULL THEN
      INSERT INTO uris (id, uri) VALUES (id, $1);
    END IF;

    INSERT INTO mentions (note_id, href_id) SELECT id, unnest FROM unnest($5);

    RETURN id;
  END
$$ LANGUAGE plpgsql;
`, callback);

exports._meta = { version: 1 };
