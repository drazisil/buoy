#!/usr/bin/env node
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

import prompts from 'prompts';
import {buildURL, DockerRegistryClient} from '../src/index.js';

const response = await prompts({
	type: 'text',
	name: 'imageName',
	message: 'Enter the image name (org/name):',
	initial: 'codecov/enterprise-web',
});

const {imageName} = response;

if (typeof imageName === 'undefined') {
	console.error('Please pass the image name!');
	process.exit(1);
}

console.log(`Image name: ${imageName}`);

const registry = new DockerRegistryClient(imageName);

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

const apiResponse = await registry.callRaw(url);

console.log(`Content type: ${apiResponse.headers.get('content-type')}`);

const {tags} = await apiResponse.json();

if (typeof tags === 'undefined') {
	console.error('No tags were found');
	process.exit(1);
}

const tagChoices = [];

for (const tag of tags) {
	tagChoices.push({title: tag});
}

const tagSelect = await prompts({
	type: 'select',
	name: 'selectedTag',
	message: 'Select a tag:',
	choices: tagChoices,
	initial: 1,
});

const {selectedTag} = tagSelect;

if (typeof selectedTag === 'undefined') {
	console.error('You didn\'t selext a tag');
	process.exit(1);
}

console.log(`Selected tag: ${tagChoices[selectedTag].title}`);

console.log(`Valid token: ${registry.isTokenValid(imageName)}`);
