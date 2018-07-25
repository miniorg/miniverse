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

import generateUuid from './generate_uuid';

test('resolves with version 1 UUID with random node', async () => {
  const uuid = await generateUuid();

  /*
    RFC 4122 - A Universally Unique IDentifier (UUID) URN Namespace
    https://tools.ietf.org/html/rfc4122#section-3
  */
  const [, , , timeHighAndVersion, clockSeqAndReserved, , node] =
    /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{2})([0-9a-f]{2})-([0-9a-f]{12})$/.exec(uuid);

  /*
    RFC 4122 - A Universally Unique IDentifier (UUID) URN Namespace
    4.1.3. Version
    https://tools.ietf.org/html/rfc4122#section-4.1.3
    >    Msb0  Msb1  Msb2  Msb3   Version  Description
    > 0     0     0     1        1     The time-based version
    >                                  specified in this document.

    4.2.2. Generation Details
    https://tools.ietf.org/html/rfc4122#section-4.2.2
    > Set the four most significant bits (bits 12 through 15) of the
    > time_hi_and_version field to the 4-bit version number corresponding to the
    > UUID version being created, as shown in the table above.
  */
  expect(parseInt(timeHighAndVersion, 16) & 0xf000).toBe(0x1000);

  /*
    > Set the two most significant bits (bits 6 and 7) of the
    > clock_seq_hi_and_reserved to zero and one, respectively.
  */
  expect(parseInt(clockSeqAndReserved, 16) & 0xc0).toBe(0x80);

  /*
    4.1.6. Node
    https://tools.ietf.org/html/rfc4122#section-4.1.6
    > For systems with no IEEE address, a randomly or pseudo-randomly
    > generated value may be used; see Section 4.5.  The multicast bit must
    > be set in such addresses, in order that they will never conflict with
    > addresses obtained from network cards.
    https://tools.ietf.org/html/rfc4122#section-4.1.6

    802.3-2015 - IEEE Standard for Ethernet - IEEE Standard
    https://ieeexplore.ieee.org/document/7428776/
    > The first bit (LSB) shall be used  in the Destination Address field as
    > an address type designation bit to identify the Destination Address either
    > as an individual or as a group address. If this bit is 0, it shall
    > indicate that the address field contains an individual address. If this
    > bit is 1, it shall indicate that  the address field contains a group
    > address that identifies none, one or more, or all of the stations
    > connected to the LAN. In the Source Address field, the first
    > bit is reserved and set to 0.
  */
  expect(parseInt(node[1], 16) & 1).toBe(1);
});
