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
import { request } from 'undici';
import sanitize from 'sanitize-filename';
import { extract } from 'tar-fs';
import createDebugLogger from 'debug';
import { buildHeaders } from '../helpers/build-headers.js';
import { buildURL } from '../helpers/build-url.js';
import { checkImageName } from '../helpers/check-image-name.js';
import { buildAuthURL } from '../helpers/build-auth-url.js';
import { callRaw } from '../helpers/call-raw.js';
const debug = createDebugLogger('buoy');
/** @module ContainerRegistryProvider */
/**
 * A generic container registry client
 *
 * Supports reading
 */
export class DefaultRegistryProvider {
    registryUsesAuthentication = false;
    authOptions = {
        usingAuth: false,
        authHost: '',
        authService: '',
    };
    tokenData = {
        token: '',
        issued: '',
        expiry: 0,
    };
    registryHost;
    debug;
    _imageName = '';
    constructor(host) {
        this.debug = debug;
        this.registryHost = host;
    }
    get imageName() {
        return this._imageName;
    }
    async getTokenFromAuthService(imageName) {
        const scope = `repository:${imageName}:pull`;
        const queryParameters = { service: this.authOptions.authService, scope };
        const iurl = buildAuthURL(this.authOptions.authHost, queryParameters);
        debug(`Request URL: ${iurl}`);
        const apiResponse = await request(iurl.toString(), { maxRedirections: 1 });
        if (![200, 301, 302].includes(apiResponse.statusCode)) {
            throw new Error(`HTTP error! Status: ${apiResponse.statusCode}`);
        }
        /** @type {{ token: string, expires_in: string, issued_at: string }} */
        const responseJSON = await apiResponse.body.json();
        const { token, expires_in: expiresInSeconds, issued_at: issued } = responseJSON;
        return {
            token,
            issued,
            expiry: Number.parseInt(expiresInSeconds, 10),
        };
    }
    async getTagsFromRegistry(imageName, tokenData) {
        const url = buildURL({
            host: this.registryHost,
            version: 'v2',
            namespace: imageName,
            endpoint: 'tags',
            reference: 'list',
        });
        this.debug(`Request URL: ${url}`);
        const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);
        const apiResponse = await callRaw(url, headers);
        this.debug(`Content type: ${apiResponse.headers['content-type'] ?? ''}`);
        const { tags } = await apiResponse.body.json();
        return tags;
    }
    async getImageManifestFromRegistry(imageName, reference, tokenData) {
        const url = buildURL({
            host: this.registryHost,
            version: 'v2',
            namespace: imageName,
            endpoint: 'manifests',
            reference,
        });
        this.debug(`Request URL: ${url}`);
        const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);
        const apiResponse = await callRaw(url, headers);
        this.debug(`Content type: ${apiResponse.headers['content-type'] ?? ''}`);
        return await apiResponse.body.json();
    }
    async getImageManifestFromRegistryByDigest(imageName, digest, tokenData) {
        const url = buildURL({
            host: this.registryHost,
            version: 'v2',
            namespace: imageName,
            endpoint: 'blobs',
            reference: digest,
        });
        this.debug(`Request URL: ${url}`);
        const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);
        const apiResponse = await callRaw(url, headers);
        this.debug(`Content type: ${apiResponse.headers['content-type'] ?? ''}`);
        if (apiResponse.headers['content-type'] !== 'application/octet-stream') {
            throw new Error('Not able to pull a signed manifest');
        }
        return apiResponse.body.json();
    }
    async getImageConfigurationFromRegistry(imageName, tokenData) {
        throw new Error('Not implemented');
    }
    /**
     *
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
        this._imageName = imageName;
        if (this.authOptions.usingAuth) {
            await this.updateTokenFromAuthServiceIfNeeded(imageName);
        }
    }
    async getLayerFromRegistry(imageName, layerSHA, tokenData) {
        const url = buildURL({
            host: this.registryHost,
            version: 'v2',
            namespace: imageName,
            endpoint: 'blobs',
            reference: layerSHA,
        });
        this.debug(`pulling layer: ${layerSHA}`);
        const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);
        const apiResponse = await callRaw(url, headers);
        const bodyBits = Buffer.from(await apiResponse.body.arrayBuffer());
        if (typeof bodyBits === 'undefined') {
            throw new TypeError('Body has no content!');
        }
        return Buffer.from(bodyBits);
    }
    /**
     * @external undici.Dispatcher.ResponseData
     * @see {@link https://github.com/nodejs/undici/blob/main/docs/api/Dispatcher.md#parameter-responsedata}
      */
    async fetchLayerFromRegistry(manifest, index, layerSHA, tag) {
        const bodyBuffer = await this.getLayerFromRegistry(this.imageName, layerSHA, this.tokenData);
        this.debug(`Gzipped length: ${bodyBuffer.byteLength}`);
        const userHomeDir = userInfo().homedir;
        const filePath = join(userHomeDir, '.buoy', this.imageName, sanitize(tag));
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
        return this.getImageManifestFromRegistryByDigest(this.imageName, digest, this.tokenData);
    }
    /**
     *
     * @param {string} tag
     * @returns {Promise<OCIImageManifest>}
     */
    async fetchImageManifestForTag(tag) {
        return this.getImageManifestFromRegistry(this.imageName, tag, this.tokenData);
    }
    /**
     * Fetch list of tags for image from registry
     * @returns {Promise<string[]>}
     */
    async fetchImageTags() {
        return this.getTagsFromRegistry(this.imageName, this.tokenData);
    }
    /**
     *
     * @param {string} imageName
     */
    async updateTokenFromAuthServiceIfNeeded(imageName) {
        if (!this.isTokenValid()) {
            this.tokenData = await this.getTokenFromAuthService(imageName);
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
        debug(`Ungzipped length: ${unGZippedBlob.byteLength}`);
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
