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

exports.up = (db, callback) => db.runSql(`CREATE FUNCTION insert_note(
  uri VARCHAR,
  attributed_to_id BIGINT,
  content TEXT,
  mentions BIGINT[]
) RETURNS BIGINT AS $$
  DECLARE id BIGINT;
  BEGIN
    INSERT INTO notes (attributed_to_id, content) VALUES ($2, $3)
      RETURNING notes.id INTO id;

    IF uri IS NOT NULL THEN
      INSERT INTO uris (id, uri) VALUES (id, $1);
    END IF;

    INSERT INTO mentions (note_id, href_id)
      SELECT id, unnest FROM unnest(mentions);

    RETURN id;
  END
$$ LANGUAGE plpgsql;

DROP FUNCTION insert_note_with_uri(VARCHAR, BIGINT, TEXT);
`, callback);
