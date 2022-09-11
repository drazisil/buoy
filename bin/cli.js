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

import {mkdirSync} from 'node:fs';
import prompts from 'prompts';
import {buildURL, DockerRegistryClient} from '../src/index.js';

const response = await prompts({
	type: 'text',
	name: 'imageNameChoice',
	message: 'Enter the image name (org/name):',
	initial: '',
});

const {imageNameChoice} = response;

if (typeof imageNameChoice === 'undefined') {
	console.error('Please pass the image name!');
	process.exit(1);
}

if (imageNameChoice.includes(':')) {
	throw new Error('Pass only the org/name, not the tag.');
}

console.log(`Image name: ${imageNameChoice}`);

const registry = new DockerRegistryClient(imageNameChoice);

console.log(`Using host: ${registry.getHost()}`);

console.log(`Using version: ${registry.getVersion()}`);

console.log(`Valid token: ${registry.isTokenValid(registry.getImageName())}`);

let url = buildURL({
	host: registry.getHost(),
	version: registry.getVersion(),
	namespace: registry.getImageName(),
	endpoint: 'tags/list',
	reference: '',
});

console.log(`Request URL: ${url}`);

let apiResponse = await registry.callRaw(url);

console.log(`Content type: ${apiResponse.headers['content-type']}`);

const {tags} = await apiResponse.body.json();

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
	console.error('You didn\'t select a tag');
	process.exit(1);
}

console.log(`Selected tag: ${tagChoices[selectedTag].title}`);

url = buildURL({
	host: registry.getHost(),
	version: registry.getVersion(),
	namespace: registry.getImageName(),
	endpoint: 'manifests',
	reference: tagChoices[selectedTag].title,
});

console.log(`Request URL: ${url}`);

apiResponse = await registry.callRaw(url);

console.log(`Content type: ${apiResponse.headers['content-type']}`);

if (apiResponse.headers['content-type'] !== 'application/vnd.docker.distribution.manifest.v1+prettyjws') {
	throw new Error('Not able to pull a signed manifest');
}

const {fsLayers, history} = await apiResponse.body.json();

const manifest = {
	fsLayers,
	history,
};

if (manifest.fsLayers.length !== manifest.history.length) {
	throw new Error('Mismatched number of history entries');
}

const layerChoices = [];

for (const layer of manifest.fsLayers) {
	layerChoices.push({title: layer.blobSum});
}

layerChoices.reverse();

mkdirSync(`tmp/${registry.getImageName()}`, {recursive: true});

/** @type {Promise<void>[]} */
const results = [];

for (const [index, {title: layerSHA}] of layerChoices.entries()) {
	results.push(registry.extractLayer(manifest, index, layerSHA, tagChoices[selectedTag].title));
}

await Promise.all(results);

console.log(`Valid token: ${registry.isTokenValid(registry.getImageName())}`);

