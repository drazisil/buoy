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
import {checkImageName, DockerRegistryClient} from '../src/index.js';
import {getImageNameFromUser} from '../src/get-image-name-from-user.js';
import {getTagfromUser} from '../src/get-tag-from-user.js';

const imageName = await getImageNameFromUser();

checkImageName(imageName);

console.log(`Image name: ${imageName}`);

const registry = new DockerRegistryClient(imageName);

console.log(`Using host: ${registry.getHost()}`);

console.log(`Using version: ${registry.getVersion()}`);

console.log(`Valid token: ${registry.isTokenValid(registry.getImageName())}`);

const tags = await registry.fetchImageTags();

if (tags.length === 0) {
	console.error('No tags were found');
	process.exit(1);
}

/** @type {Array<{title: string}>} */
const tagChoices = [];

for (const tag of tags) {
	tagChoices.push({title: tag});
}

const selectedTag = await getTagfromUser(tagChoices);

const manifest = await registry.fetchImageManifestForTag(selectedTag);

if (manifest.fsLayers.length !== manifest.history.length) {
	throw new Error('Mismatched number of history entries');
}

const layerChoices = [];

for (const layer of manifest.fsLayers) {
	layerChoices.push({title: layer.blobSum});
}

layerChoices.reverse();

mkdirSync(`tmp/${registry.getImageName()}`, {recursive: true});

const results = [];

for (const [index, {title: layerSHA}] of layerChoices.entries()) {
	results.push(registry.extractLayer(manifest, index, layerSHA, selectedTag));
}

await Promise.all(results);

console.log(`Valid token: ${registry.isTokenValid(registry.getImageName())}`);

