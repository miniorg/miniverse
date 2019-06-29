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

import S3 = require('aws-sdk/clients/s3');

if (!process.env.AWS_S3_BUCKET) {
  throw new Error('AWS_S3_BUCKET environment variable not specified.');
}

if (!process.env.AWS_S3_URL_PREFIX) {
  throw new Error('AWS_S3_URL_PREFIX environment variable not specified.');
}

if (!process.env.HOST) {
  throw new Error('HOST environment variable not specified.');
}

export default {
  analytics: { trackingId: process.env.ANALYTICS_TRACKING_ID },
  console,
  content: {
    frame: { sourceList: process.env.CONTENT_FRAME_SOURCE_LIST },
    image: { sourceList: process.env.CONTENT_IMAGE_SOURCE_LIST },
    script: {
      sourceList: process.env.CONTENT_SCRIPT_SOURCE_LIST,
      sources: process.env.CONTENT_SCRIPT_SOURCES ?
        process.env.CONTENT_SCRIPT_SOURCES.split(';') : []
    }
  },
  fingerHost: process.env.FINGER_HOST,
  host: process.env.HOST,
  pg: {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT && parseInt(process.env.PGPORT) || 5432
  },
  redis: {
    prefix: process.env.REDIS_PREFIX,
    url: process.env.REDIS_URL
  },
  s3: {
    service: new S3({
      endpoint: process.env.AWS_ENDPOINT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      signatureVersion: process.env.AWS_SIGNATURE_VERSION,
      s3BucketEndpoint: Boolean(process.env.AWS_S3_BUCKET_ENDPOINT),
      s3ForcePathStyle: Boolean(process.env.AWS_S3_FORCE_PATH_STYLE),
    }),
    bucket: process.env.AWS_S3_BUCKET,
    keyPrefix: process.env.AWS_S3_KEY_PREFIX || '',
    urlPrefix: process.env.AWS_S3_URL_PREFIX
  }
};
