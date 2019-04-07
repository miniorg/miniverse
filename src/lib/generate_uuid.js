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

import { randomBytes } from 'crypto';
import { promisify } from 'util';

const promisifiedRandomBytes = promisify(randomBytes);

export default async () => {
  const timestamp = (Date.now() + 12219292800000) * 10000;
  const timestampQuotient = timestamp / 0x100000000;
  const timestampRemainder = timestamp % 0x100000000;
  const random = await promisifiedRandomBytes(8);

  random[0] = (randomBytes[0] & 0x3f) | 0x80;
  random[2] |= 1;

  const timeLow = Math.floor(timestampRemainder);
  const timeMid = timestampQuotient & 0xffff;
  const timeHighAndVersion = (timestampQuotient >> 16) | 0x1000;
  const clockSeq = random.slice(0, 2);
  const node = random.slice(2);

  return [
    ('0000000' + timeLow.toString(16)).slice(-8),
    ('000' + timeMid.toString(16)).slice(-4),
    timeHighAndVersion.toString(16),
    clockSeq.toString('hex'),
    node.toString('hex')
  ].join('-');
}
