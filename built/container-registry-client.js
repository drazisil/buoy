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
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { join } from 'node:path/posix';
import { Stream } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import sanitize from 'sanitize-filename';
import { extract } from 'tar-fs';
import { checkImageName } from './helpers/check-image-name.js';
/** @module ContainerRegistryClient */
/**
 * A generic container registry client
 *
 * Supports reading
 */
export class ContainerRegistryClient {
    static newWithProvider(registryConnectionProvider) {
        return new ContainerRegistryClient(registryConnectionProvider);
    }
    imageName;
    registryConnectionProvider = undefined;
    registryUsesAuthentication = false;
    tokenData = {
        token: '',
        issued: '',
        expiry: 0,
    };
    constructor(registryConnectionProvider) {
        this.registryConnectionProvider = registryConnectionProvider;
    }
    /**
     * @return {string}
     */
    getHost() {
        return this.registryConnectionProvider.registryHost;
    }
    /**
     * @return {string}
     */
    getImageName() {
        return this.imageName;
    }
    /**
     *
     * @param {string} imageName
     * @returns {boolean} If the current timestamp is greater then the expiry
     */
    isTokenValid() {
        if (this.tokenData.issued === '') {
            return false;
        }
        const issuedDate = new Date(this.tokenData.issued);
        const expiryDate = issuedDate.setSeconds(issuedDate.getSeconds() + this.tokenData.expiry);
        return Date.now() < expiryDate;
    }
    /**
     *
     * @param {string} imageName
     */
    async setImageName(imageName) {
        checkImageName(imageName);
        this.imageName = imageName;
        await this.updateTokenFromAuthServiceIfNeeded(imageName);
    }
    /**
     * @external undici.Dispatcher.ResponseData
     * @see {@link https://github.com/nodejs/undici/blob/main/docs/api/Dispatcher.md#parameter-responsedata}
      */
    async fetchLayerFromRegistry(manifest, index, layerSHA, tag) {
        const bodyBuffer = await this.registryConnectionProvider.getLayerFromRegistry(this.getImageName(), layerSHA, this.tokenData);
        console.log(`Gzipped length: ${bodyBuffer.byteLength}`);
        const userHomeDir = userInfo().homedir;
        const filePath = join(userHomeDir, '.buoy', this.getImageName(), sanitize(tag));
        mkdirSync(filePath, { recursive: true });
        const layerFilePath = `${filePath}/${index}_${layerSHA}`;
        await writeLayerToFS(layerFilePath, bodyBuffer);
    }
    /**
     * Fetch a manifest from the registry by it's digest
     * @param {string} digest
     * @returns {Promise<OCIImageManifest>}
     */
    async fetchManifestByDigest(digest) {
        return this.registryConnectionProvider.getImageManifestFromRegistryByDigest(this.getImageName(), digest, this.tokenData);
    }
    /**
     *
     * @param {string} tag
     * @returns {Promise<OCIImageManifest>}
     */
    async fetchImageManifestForTag(tag) {
        return this.registryConnectionProvider.getImageManifestFromRegistry(this.getImageName(), tag, this.tokenData);
    }
    /**
     * Fetch list of tags for image from registry
     * @returns {Promise<string[]>}
     */
    async fetchImageTags() {
        return this.registryConnectionProvider.getTagsFromRegistry(this.imageName, this.tokenData);
    }
    /**
     *
     * @param {string} imageName
     */
    async updateTokenFromAuthServiceIfNeeded(imageName) {
        if (!this.isTokenValid()) {
            this.tokenData = await this.registryConnectionProvider.getTokenFromAuthService(imageName);
        }
    }
}
async function writeLayerToFS(filePath, bodyBuffer) {
    if (bodyBuffer.byteLength === 32) {
        await writeFile(`${filePath}.empty`, Buffer.alloc(0));
    }
    else {
        await writeFile(`${filePath}.gz`, bodyBuffer);
        const unGZippedBlob = gunzipSync(bodyBuffer);
        console.log(`Ungzipped length: ${unGZippedBlob.byteLength}`);
        try {
            Stream.Readable.from(unGZippedBlob).pipe(extract(filePath, {
                dmode: 0o555,
                fmode: 0o444, // All files should be readable
            }));
        }
        catch (error) {
            throw new Error(`Error extracting: ${String(error)}`);
        }
    }
}
