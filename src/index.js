// Buoy is a image layer scanner
// Copyright (C) 2022  Drazi Crendraven
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import {buildURL} from '../lib/container-registry-client.js';
import {DockerRegistryClient} from './docker-registry-reader.js';

if (process.argv.length < 3) {
	throw new Error('Please pass the image name!');
}

const imageName = process.argv[2];

console.log(`Image name: ${imageName}`);

const registry = new DockerRegistryClient('codecov/enterprise-web');

console.log(`Using host: ${registry.host}`);

console.log(`Using version: ${registry.version}`);

console.log(`Valid token: ${registry.isTokenValid(imageName)}`);

const url = buildURL({
	host: registry.host,
	version: registry.version,
	namespace: 'codecov/enterprise-web',
	endpoint: 'tags/list',
	reference: '',
});

console.log(`Request URL: ${url}`);

const response = await registry.callRaw(url);

console.log(`Content type: ${response.headers.get('content-type')}`);

console.dir(response, {depth: 1});

console.log(`Valid token: ${registry.isTokenValid(imageName)}`);
