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
import { mkdirSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path/posix';
import { inspect } from 'node:util';
import createDebugLogger from 'debug';
import { registryConfigurations, DefaultRegistryProvider } from './provider/index.js';
import { getTagfromUser, getImageNameFromUser, pickRegistryFromUser, checkImageName } from './index.js';
const debug = createDebugLogger('buoy');
const registryConfiguration = await pickRegistryFromUser(registryConfigurations);
const imageName = await getImageNameFromUser();
checkImageName(imageName);
console.log(`Image name: ${imageName}`);
const registry = !registryConfiguration.usesDefaultProvider && typeof registryConfiguration.customRegistryProvider !== 'undefined' ? registryConfiguration.customRegistryProvider : new DefaultRegistryProvider(registryConfiguration.host);
await registry.setImageName(imageName);
console.log(`Using host: ${registry.registryHost}`);
console.log(`Valid token: ${String(registry.isTokenValid())}`);
const tags = await registry.fetchImageTags();
if (tags.length === 0) {
    console.error('No tags were found');
    process.exit(1);
}
/** @type {Array<{title: string}>} */
const tagChoices = [];
for (const tag of tags) {
    tagChoices.push({ title: tag });
}
const selectedTag = await getTagfromUser(tagChoices);
const imageManifest = await registry.fetchImageManifestForTag(selectedTag);
const layerChoices = [];
for (const layer of imageManifest.layers) {
    layerChoices.push({ title: layer.digest, digest: layer.digest });
}
layerChoices.reverse();
const userHomeDir = userInfo().homedir;
const savePath = join(userHomeDir, '.buoy', registry.imageName, selectedTag);
mkdirSync(savePath, { recursive: true });
writeFileSync(`${savePath}/manifest.json`, JSON.stringify(imageManifest));
const configManifest = await registry.fetchManifestByDigest(imageManifest.config.digest);
writeFileSync(`${savePath}/config.manifest.json`, JSON.stringify(configManifest));
const results = [];
debug(inspect(layerChoices));
for (const [index, { title: layerSHA }] of layerChoices.entries()) {
    results.push(registry.fetchLayerFromRegistry(imageManifest, index, layerSHA, selectedTag));
}
await Promise.all(results);
console.log(`Valid token: ${String(registry.isTokenValid())}`);
