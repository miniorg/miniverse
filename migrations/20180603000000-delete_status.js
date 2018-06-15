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

exports.up = (db, callback) => db.runSql(`CREATE OR REPLACE FUNCTION delete_status(
  id BIGINT,
  attributed_to_id BIGINT
) RETURNS VOID AS $$
  DECLARE announce_id BIGINT;
  BEGIN
    IF EXISTS (SELECT TRUE FROM statuses WHERE statuses.id = $1 AND attributed_to_id = $2) THEN
      INSERT INTO tombstones (id) VALUES ($1);

      FOR announce_id IN SELECT announces.id FROM announces WHERE object_id = $1 LOOP
        INSERT INTO tombstones (id) VALUES (announce_id);
        DELETE FROM statuses WHERE statuses.id = announce_id;
      END LOOP;

      DELETE FROM statuses WHERE statuses.id = $1;
    END IF;
  END
$$ LANGUAGE plpgsql;
`, callback);

exports._meta = { version: 1 };
