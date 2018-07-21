# Miniverse

Miniverse is an experimental microblogging software capbable to perform
server-to-server interaction with recent Mastodon versions.

# Some database caveats
## Do not delete any record of `local_accounts`
References from `local_accounts` has `ON DELETE RESTRICT` because every records
of `local_accounts` includes a precious private key. You should follow the
principle when making a new reference.

## Do not update `id` column of any record
The application tracks references by `id` column and therefore
`ON UPDATE CASCADE`, which is effective only on the database, is not sufficient.
References to `id` column should have `ON UPDATE RESTRICT`.

# License

`app/service-worker.js` is copied from:
https://github.com/sveltejs/sapper-template/blob/master/app/service-worker.js

It is written by Sapper authors, and licensed under LIL.

The other portions are licensed under AGPL-3.0 by Akihiko Odaki.
