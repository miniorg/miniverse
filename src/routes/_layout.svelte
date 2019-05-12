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

{#each $session.scripts as script}
<script async src={script}></script>
{/each}
<main><slot></slot></main>
{#if analytics.trackingId}
  <p>This site sends various data potentially private to third party. Check
     loaded scripts and block them if you don't want.</p>
{/if}
<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { stores } from '@sapper/app';

  const { session } = stores();
  const { analytics } = get(session);

  onMount(() => {
    ga.l = +new Date;
    ga.q.unshift(
      ['create', analytics.trackingId, 'auto'], ['send', 'pageview']);
  });
</script>
