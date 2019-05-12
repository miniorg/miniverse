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

const LicenseChecker = require('@jetbrains/ring-ui-license-checker');
const { join } = require('path');
const { BannerPlugin, DefinePlugin } = require('webpack');
const { client, server, serviceworker } = require('sapper/config/webpack');
const { dependencies } = require('./package');

const extensions = ['.mjs', '.js', '.ts', '.svelte'];
const mode = process.env.NODE_ENV;
const dev = mode == 'development';

module.exports = {
  client: {
    entry: client.entry(),
    output: client.output(),
    mode,
    devtool: 'source-map',
    resolve: {
      alias: {
        isomorphism: join(__dirname, 'src/lib/isomorphism/browser'),
        url: join(__dirname, 'src/lib/isomorphism/browser/url')
      },
      extensions
    },
    module: {
      rules: [
        {
          test: /\.svelte$/,
          use: {
            loader: 'svelte-loader',
            options: {
              dev,
              hydratable: true,
              shared: true,

              // Hooks for granular HMR support · Issue #2377 · sveltejs/svelte
              // https://github.com/sveltejs/svelte/issues/2377
              hotReload: false,
            }
          }
        }, {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: { configFile: 'browser.tsconfig.json' }
          }
        }
      ],
    },
    plugins: [
      new DefinePlugin({
        'process.browser': true,
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      })
    ]
  },
  server: {
    entry: Object.assign({
      processor: join(__dirname, './src/processor')
    }, server.entry()),
    output: server.output(),
    mode,
    devtool: 'source-map',
    externals(_context, request, callback) {
      if (request == 'svelte/store.mjs') {
        return callback(null, 'commonjs svelte/store');
      }

      if (request in dependencies ||
        request == 'encoding' ||
        request.startsWith('encoding/')) {
        return callback(null, 'commonjs ' + request);
      }

      for (const key in dependencies) {
        if (request.startsWith(key + '/')) {
          return callback(null, 'commonjs ' + request);
        }
      }

      callback();
    },
    resolve: {
      alias: { isomorphism: join(__dirname, 'src/lib/isomorphism/node') },
      extensions
    },
    target: 'node',
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: join(__dirname, 'src'),
          type: 'javascript/auto'
        },
        {
          test: /\.svelte$/,
          use: {
            loader: 'svelte-loader',
            options: {
              css: false,
              dev,
              generate: 'ssr'
            }
          }
        }, {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: { configFile: 'node.tsconfig.json' }
          }
        }
      ]
    },
    plugins: [
      new BannerPlugin({
        banner: '#!/usr/bin/env node',
        raw: true,
        test: /^processor\.js$/
      })
    ]
  },
  serviceworker: {
    entry: serviceworker.entry(),
    output: serviceworker.output(),
    mode: process.env.NODE_ENV,
    devtool: 'source-map'
  }
};

if (dev) {
  // Hooks for granular HMR support · Issue #2377 · sveltejs/svelte
  // https://github.com/sveltejs/svelte/issues/2377
  // module.exports.client.plugins.push(new HotModuleReplacementPlugin);
} else {
  module.exports.client.plugins.push(new LicenseChecker({
    filename: '../../../static/license.html'
  }));
}
