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
import Mention from './mention';
import ParsedActivityStreams, { NoHost } from './parsed_activitystreams';
import Person from './person';
import Relation, { withRepository } from './relation';
import { encodeSegment } from './uri';

export default class Note extends Relation {
  async toActivityStreams() {
    const [attributedTo, mentions] = await Promise.all([
      this.select('attributedTo'),
      this.select('mentions').then(array =>
        Promise.all(array.map(element => element.toActivityStreams())))
    ]);

    const repositoryHost = domainToASCII(this.repository.host);
    const acct = encodeSegment(attributedTo.host ?
      `${attributedTo.username}@${domainToUnicode(attributedTo.host)}` :
      attributedTo.username);

    return {
      type: 'Note',
      id: `https://${repositoryHost}/@${acct}/${this.id}`,
      attributedTo: await attributedTo.getUri(),
      to: 'https://www.w3.org/ns/activitystreams#Public',
      content: this.content,
      tag: mentions
    };
  }

  static async create(repository, uri, attributedTo, content, mentions) {
    const note = new this({
      repository,
      attributedTo,
      content,
      mentions: mentions.map(href => new Mention({ repository, href }))
    });
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
    const [uri, to, content, mentions] = await Promise.all([
      object.getId(),
      object.getTo().then(elements =>
        Promise.all(elements.map(element => element.getId()))),
      object.getContent(),
      object.getTag().then(tag => Promise.all(tag.map(async element => {
        const type = await element.getType();

        if (type.has('Mention')) {
          const href = await element.getHref();
          const parsed = new ParsedActivityStreams(repository, href, NoHost);

          return Person.fromParsedActivityStreams(repository, parsed);
        }

        return null;
      }))).then(nullables => nullables.filter(Boolean)),
    ]);

    if (!to.includes('https://www.w3.org/ns/activitystreams#Public')) {
      return null;
    }

    return this.create(repository, uri, attributedTo, content, mentions);
  }
}

Note.references = {
  attributedTo: {
    query: withRepository('selectPersonById'),
    id: 'attributedToId'
  },
  mentions: {
    query: withRepository('selectMentionsIncludingPersonsOuterRemoteAccountsOuterUrisByNoteId'),
    id: 'id'
  },
};
