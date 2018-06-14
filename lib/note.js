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
import Status from './status';
import URI, { encodeSegment } from './uri';

export default class Note extends Relation {
  async toActivityStreams() {
    const [attributedTo, mentions] = await Promise.all([
      this.select('status').then(status => status.select('person')),
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

  static async create(repository, uri, person, content, mentions) {
    const note = new this({
      repository,
      status: new Status({
        repository,
        person,
        uri: uri && new URI({ repository, uri })
      }),
      content,
      mentions: mentions.map(href => new Mention({ repository, href }))
    });

    const [recipients] = await Promise.all([
      person.select('followers'),
      repository.insertNote(note)
    ]);

    await Promise.all([
      person.host || Promise.all(recipients.map(
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
        recipients.concat([person]).filter(recipient => !recipient.host),
        note)
    ]);

    return note;
  }

  static async fromParsedActivityStreams(repository, object, givenAttributedTo) {
    const localPrefix = `https://${domainToASCII(repository.host)}/@`;
    const uri = await object.getId();

    if (uri) {
      if (uri.startsWith(localPrefix)) {
        const [username, id] = uri.slice(localPrefix.length).split('/', 2);
        const note = await repository.selectNoteById(id);
        const status = await note.select('status');
        const person = await status.select('person');

        if (username != person.username) {
          throw new Error;
        }

        return note;
      }

      const uriEntity = await repository.selectURI(uri);

      if (uriEntity) {
        return repository.selectNoteById(uriEntity.id);
      }
    }

    const [attributedTo, to, content, mentions] = await Promise.all([
      givenAttributedTo || object.getAttributedTo().then(
        Person.fromParsedActivityStreams.bind(Person, repository)),
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
  status: { query: withRepository('selectStatusById'), id: 'id' },
  mentions: {
    query: withRepository('selectMentionsIncludingPersonsByNoteId'),
    id: 'id'
  },
};
