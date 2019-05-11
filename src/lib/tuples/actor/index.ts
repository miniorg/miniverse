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

import Base from './base';
import FromParsedActivityStreams from './from_parsed_activitystreams';
import Resolver from './resolver';

export default class Actor extends Base {}

for (const Constructor of [FromParsedActivityStreams, Resolver]) {
  for (const key of Object.getOwnPropertyNames(Constructor)) {
    if (!['length', 'name', 'prototype'].includes(key)) {
      (Actor as any)[key] = (Constructor as any)[key];
    }
  }
}
