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
import postStatus from './transfer/post_status';
import URI, { encodeSegment } from './uri';

async function resolveNoteByURIIfLocal(repository, uri) {
  const localPrefix = `https://${domainToASCII(repository.host)}/@`;

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

  return null;
}

export default class Note extends Relation {
  async toActivityStreams() {
    const [
      [attributedToPerson, attributedTo],
      mentions,
      inReplyTo
    ] = await Promise.all([
      this.select('status')
          .then(status => status.select('person'))
          .then(person => Promise.all([person, person.getUri()])),
      this.select('mentions').then(array =>
        Promise.all(array.map(element => element.toActivityStreams()))),
      this.select('inReplyTo').then(status => status && status.getUri()),
    ]);

    const repositoryHost = domainToASCII(this.repository.host);
    const acct = encodeSegment(attributedToPerson.host ?
      `${attributedToPerson.username}@${domainToUnicode(attributedToPerson.host)}` :
      attributedToPerson.username);

    return {
      type: 'Note',
      id: `https://${repositoryHost}/@${acct}/${this.id}`,
      attributedTo,
      inReplyTo,
      to: 'https://www.w3.org/ns/activitystreams#Public',
      summary: this.summary,
      content: this.content,
      tag: mentions
    };
  }

  validate() {
    if (this.summary == '') {
      throw new Error;
    }
  }

  static async create(repository, person, content, { uri, inReplyTo = null, inReplyToUri = null, summary = null, mentions } = {}) {
    const note = new this({
      repository,
      status: new Status({
        repository,
        person,
        uri: uri ? new URI({ repository, uri }) : null
      }),
      inReplyTo,
      summary,
      content,
      mentions: mentions ?
        mentions.map(href => new Mention({ repository, href })) : []
    });

    note.validate();
    await repository.insertNote(note, inReplyToUri);
    await postStatus(repository, note.status);

    return note;
  }

  static async fromParsedActivityStreams(repository, object, givenAttributedTo) {
    const uri = await object.getId();

    if (uri) {
      const note = await resolveNoteByURIIfLocal(repository, uri);
      if (note) {
        return note;
      }

      const uriEntity = await repository.selectURI(uri);
      if (uriEntity) {
        return repository.selectNoteById(uriEntity.id);
      }
    }

    const [
      attributedTo, to, [inReplyTo, inReplyToUri], summary,
      content, mentions
    ] = await Promise.all([
      givenAttributedTo || object.getAttributedTo().then(
        Person.fromParsedActivityStreams.bind(Person, repository)),
      object.getTo().then(elements =>
        Promise.all(elements.map(element => element.getId()))),
      object.getInReplyTo().then(async parsed => {
        if (parsed) {
          const uri = await parsed.getId();
          const note = await resolveNoteByURIIfLocal(repository, uri);

          return [note ? await note.select('status') : null, uri];
        }

        return [null, null];
      }),
      object.getSummary(),
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

    return this.create(
      repository,
      attributedTo,
      content,
      { uri, inReplyTo, inReplyToUri, summary, mentions });
  }
}

Note.references = {
  status: {
    query: withRepository('selectStatusById'),
    id: 'id',
    inverseOf: 'extension'
  },
  mentions: {
    query: withRepository('selectMentionsIncludingPersonsByNoteId'),
    id: 'id'
  },
  inReplyTo: { query: withRepository('selectStatusById'), id: 'inReplyToId' },
};
