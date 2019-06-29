/*
  Copyright (C) 2019  Miniverse authors

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

exports.up = (db, callback) => db.runSql(`
CREATE FUNCTION insert_document_without_url(dirty_id integer)
    RETURNS bigint LANGUAGE plpgsql AS $_$
  DECLARE id bigint;
  BEGIN
    INSERT INTO documents (uuid, format) SELECT uuid, format
      FROM dirty_documents WHERE dirty_documents.id = $1
      RETURNING documents.id INTO id;

    DELETE FROM dirty_documents WHERE dirty_documents.id = $1;

    RETURN id;
  END
$_$;`, callback);

exports._meta = { version: 1 };
