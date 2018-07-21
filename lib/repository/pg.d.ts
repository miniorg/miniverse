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

import { Client } from 'pg';

interface Query {
  name: string;
  text: string;
  values?: any[];
}

interface Result {
  rowCount: number;
  rows: any;
}

export default class {
  constructor(pg: Client);
  query(query: Query | string): Promise<Result>;
  readonly pg: Client;
}
