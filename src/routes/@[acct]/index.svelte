<!--
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
-->

<h1>{actor.preferredUsername}</h1>
{#if $session.user && $session.user.id != actor.id}
  <button on:click='{follow}'>Follow</button>
{/if}
<ol>
  {#each actor.outbox.orderedItems as item}
    <li>{JSON.stringify(item)}</li>
  {/each}
</ol>
<script context='module'>
  import { get } from 'svelte/store';
  import { stores } from '@sapper/app';
  import {
    fetch as fetchActor,
    fetchOutbox,
    follow
  } from '../../lib/session/actor';

  export async function preload({ params }, session) {
    const actor = await fetchActor(session, this.fetch, params.acct);

    if (actor) {
      await fetchOutbox(this.fetch, actor);
      return { actor };
    }

    this.error(404, 'Not Found');
  }
</script>
<script>
  const { session } = stores();
  let actor;

  function follow() {
    follow(get(session), fetch, actor);
  }
</script>
