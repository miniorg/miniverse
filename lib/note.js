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

import { domainToASCII, domainToUnicode } from 'url';
import Relation, { withRepository } from './relation';
import { encodeSegment } from './uri';

export default class Note extends Relation {
  async toActivityStreams() {
    const { username, host } = await this.select('attributedTo');
    const acct = host ? `${username}@${domainToUnicode(host)}` : username;
    const encodedRepositoryHost = domainToASCII(this.repository.host);
    const encodedAcct = encodeSegment(acct);

    return {
      type: 'Note',
      id: `https://${encodedRepositoryHost}/@${encodedAcct}/${this.id}`,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      content: this.content
    };
  }

  static async create(repository, uri, attributedTo, content) {
    const note = new this({ repository, attributedTo, content });
    const [recipients] = await Promise.all([
      repository.selectPersonsIncludingOuterRemoteAccountsByFollowee(attributedTo),
      repository.insertNote(note, uri)
    ]);

    await Promise.all([
      attributedTo.host || Promise.all(recipients.map(
        recipient => recipient.host ? recipient.select('account') : null)).then(
          recipients => {
            recipients = recipients.filter(Boolean);
            const set = new Set(recipients.map(({ inboxURIId }) => inboxURIId));

            return Promise.all((function *() {
              for (const inboxURIId of set) {
                yield repository.queue.add({
                  type: 'postNote',
                  noteId: note.id,
                  inboxURIId
                });
              }
            })());
          }),
      repository.insertIntoInboxes(
        recipients.concat([attributedTo]).filter(recipient => !recipient.host),
        note)
    ]);

    return note;
  }

  static async fromParsedActivityStreams(repository, attributedTo, object) {
    const [uri, content] = await Promise.all([
      object.getId(),
      object.getContent()
    ]);

    return this.create(repository, uri, attributedTo, content);
  }
}

Note.references = {
  attributedTo: {
    query: withRepository('selectPersonById'),
    id: 'attributedToId'
  }
};
