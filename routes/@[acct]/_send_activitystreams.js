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

export default async (response, object) => {
  const message = await object.toActivityStreams();

  message['@context'] = [
    'https://miniverse.social/ns',
    'https://w3id.org/security/v1',
    'https://www.w3.org/ns/activitystreams'
  ];

  /*
    Mastodon requires Content-Type to be application/activity+json:
    Hook up URL-based resource look-up to ActivityPub (#4589) · tootsuite/mastodon@4e75f0d
    https://github.com/tootsuite/mastodon/commit/4e75f0d88932511ad154773f4c77a485367ed36c#diff-328eab87b2768b5bd2b03f27e89a7dceR32
    Be aware that it does not accept the following type because of a bug:
    application/ld+json; profile="https://www.w3.org/ns/activitystreams"
  */
  response.set('Content-Type', 'application/activity+json');

  response.send(message);
};
