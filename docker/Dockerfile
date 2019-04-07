# Copyright (C) 2018  Miniverse authors
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, version 3 of the License.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

FROM node:11-alpine as base
RUN apk add expat fftw giflib glib lcms2 libexif libjpeg-turbo libpng libwebp orc tiff

FROM base
RUN apk add --no-cache --virtual build \
    build-base expat-dev fftw-dev giflib-dev glib-dev lcms2-dev libexif-dev \
    libjpeg-turbo-dev libpng-dev libwebp-dev pkgconfig python2 orc-dev tiff-dev
RUN wget https://github.com/libvips/libvips/releases/download/v8.7.4/vips-8.7.4.tar.gz && \
    echo 'c2ba4455e477ab707fb0abf946fbae010e266364  vips-8.7.4.tar.gz' | sha1sum -c
COPY miniverse-0.0.1.tgz /
RUN tar xf vips-8.7.4.tar.gz && \
    cd vips-8.7.4 && \
    ./configure && \
    make -j`getconf _NPROCESSORS_ONLN` install && \
    cd .. && \
    npm -g config set user root && npm -g install miniverse-0.0.1.tgz && \
    rm -r miniverse-0.0.1.tgz vips-8.7.4 vips-8.7.4.tar.gz && \
    apk del build

FROM base
CMD ["miniverse", "sh", "-c", "db-migrate up && exec sapper start"]
COPY --from=1 / /
