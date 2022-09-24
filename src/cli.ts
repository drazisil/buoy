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

import {mkdirSync, writeFileSync} from 'node:fs';
import {getImageNameFromUser} from './get-image-name-from-user.js';
import {getTagfromUser} from './get-tag-from-user.js';
import {checkImageName, DockerRegistryClient} from './index.js';

const imageName = await getImageNameFromUser();

checkImageName(imageName);

console.log(`Image name: ${imageName}`);

const registry = new DockerRegistryClient(imageName);

console.log(`Using host: ${registry.getHost()}`);

console.log(`Using version: ${registry.getVersion()}`);

console.log(`Valid token: ${String(registry.isTokenValid(registry.getImageName()))}`);

const tags = await registry.fetchImageTags();

if (tags.length === 0) {
	console.error('No tags were found');
	process.exit(1);
}

/** @type {Array<{title: string}>} */
const tagChoices: Array<{title: string}> = [];

for (const tag of tags) {
	tagChoices.push({title: tag});
}

const selectedTag = await getTagfromUser(tagChoices);

const imageManifest = await registry.fetchImageManifestForTag(selectedTag);

const layerChoices = [];

for (const layer of imageManifest.layers) {
	layerChoices.push({title: layer.digest});
}

layerChoices.reverse();

const savePath = `tmp/${registry.getImageName()}/${selectedTag}`;

mkdirSync(savePath, {recursive: true});

writeFileSync(`${savePath}/manifest.json`, JSON.stringify(imageManifest));

const configManifest = await registry.fetchManifestByDigest(imageManifest.config.digest);

writeFileSync(`${savePath}/config.manifest.json`, JSON.stringify(configManifest));

const results = [];

for (const [index, {title: layerSHA}] of layerChoices.entries()) {
	results.push(registry.extractLayer(imageManifest, index, layerSHA, selectedTag));
}

await Promise.all(results);

console.log(`Valid token: ${String(registry.isTokenValid(registry.getImageName()))}`);

