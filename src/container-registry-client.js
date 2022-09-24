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
import {writeFile} from 'node:fs/promises';
import {Stream} from 'node:stream';
import {gunzipSync} from 'node:zlib';
import sanitize from 'sanitize-filename';
import {extract} from 'tar-fs';
// eslint-disable-next-line no-unused-vars
import {Dispatcher, request} from 'undici';

/** @module ContainerRegistryClient */

/**
 * Used by {@link ContainerRegistryClient.setAuthOptions}
 * @global
 * @typedef {Object} AuthOptions
 * @prop {string} authHost
 * @prop {string} authService
 */

/**
 * Used by {@link OCIImageManifest}
 * @see {@link https://github.com/opencontainers/image-spec/blob/e67f056ed21bd4d7360f3bed5ee393b0682eafe7/descriptor.md}
 * @global
 * @typedef {Object} OCIContentDescriptor
 * @prop {string} mediaType
 * @prop {string} digest
 * @prop {number} size
 * @prop {string[]} [urls]
 * @prop {Record<string, string>} [annotations]
 * @prop {string} [data]
 * @prop {string} [artifactType]
 */

/**
 * Used by {@link ContainerRegistryClient.extractLayer}
 * @see {@link https://github.com/opencontainers/image-spec/blob/e67f056ed21bd4d7360f3bed5ee393b0682eafe7/manifest.md}
 * @global
 * @typedef {Object} OCIImageManifest
 * @prop {number} schemaVersion
 * @prop {string} mediaType
 * @prop {OCIContentDescriptor} config
 * @prop {OCIContentDescriptor[]} layers
 * @prop {OCIContentDescriptor} [subject]
 * @prop {Record<string, string>} [annotations]
 */

/**
 * Used by {@link OCIImageConfigurationConfig}
 * @global
 * @typedef {Object} OCIImageConfigurationRootFS
 * @prop {"layers"} type
 * @prop {string[]} diff_ids
 */

/**
 * Used by {@link OCIImageConfigurationConfig}
 * @global
 * @typedef {Object} OCIImageConfigurationHistory
 * @prop {string} [created]
 * @prop {string} [auhor]
 * @prop {string} [created_by]
 * @prop {string} [comment]
 * @prop {boolean} [empty_layer]
 */

/**
 * Used by {@link OCIImageConfiguration}
 * @global
 * @typedef {Object} OCIImageConfigurationConfig
 * @prop {string} [User]
 * @prop {string} [ExposedPorts]
 * @prop {string[]} [Env]
 * @prop {string[]} [Entrypoint]
 * @prop {string[]} [Cmd]
 * @prop {Record<string, {}>} [Volumes]
 * @prop {string} [WorkingDir]
 * @prop {Record<string, string>} [Labels]
 * @prop {string} [StopSignal]
 * @prop {number} [Memory]
 * @prop {number} [MemorySwap]
 * @prop {number} [CpuShares]
 * @prop {{}} [HealthCheck]
 * @prop {OCIImageConfigurationRootFS} rootfs
 * @prop {OCIImageConfigurationHistory[]} [history]
 *
 */

/**
 * Used by {@link ContainerRegistryClient.fetchImageManifestForTag}
 * @see {@link https://github.com/opencontainers/image-spec/blob/e67f056ed21bd4d7360f3bed5ee393b0682eafe7/config.md}
 * @global
 * @typedef {Object} OCIImageConfiguration
 * @prop {string} [created]
 * @prop {string} [author]
 * @prop {string} architecture
 * @prop {string} os
 * @prop {string} [os.version]
 * @prop {string[]} [os.features]
 * @prop {string} [variant]
 * @prop {OCIImageConfigurationConfig} [config]
 */

/**
 * A generic container registry client
 *
 * Supports reading
 */
export class ContainerRegistryClient {
	/** @type {string} */
	authHost = '';
	/** @type {string} */
	authService = '';
	/** @type {string} */
	imageName = '';
	/** @type {string} */
	registryHost;
	/** @type {string} */
	registryVersion;
	/** @type {Record<string, { token: string, issued: string, expiry: number }>} */
	tokenData;
	/** @type {boolean} */
	useAuth = false;

	/**
     *
     * @param {string} registryHost
     * The URL of the registry, without protocol or port
     * @param {AuthOptions} [authOptions]
     * An optional object containg the host and service for auth
     */
	constructor(registryHost, authOptions = undefined) {
		checkHostURL(registryHost);
		this.registryHost = registryHost;
		this.registryVersion = 'v2';
		this.authService = registryHost;
		if (typeof authOptions !== 'undefined') {
			this.authHost = authOptions.authHost;
			this.authService = authOptions.authService;
		}

		this.tokenData = {};
	}

	/**
     * @return {string}
     */
	getHost() {
		return this.registryHost;
	}

	/**
     * @return {string}
     */
	getImageName() {
		return this.imageName;
	}

	/**
	 * The version of the registry schema we will use
	 * @return {string} The version of the registry schema we will use
     */
	getVersion() {
		return this.registryVersion;
	}

	/**
     *
     * @param {string} imageName
     * @returns {boolean} If the current timestamp is greater then the expiry
     */
	isTokenValid(imageName) {
		if (typeof this.tokenData[imageName] === 'undefined') {
			return false;
		}

		const issuedDate = new Date(this.tokenData[imageName].issued);
		const expiryDate = issuedDate.setSeconds(issuedDate.getSeconds() + this.tokenData[imageName].expiry);
		return Date.now() < expiryDate;
	}

	/**
     *
     * @param {AuthOptions} authOptions
     */
	setAuthOptions({authHost, authService}) {
		checkHostURL(authHost);
		this.authHost = authHost;
		this.authService = authService;
		this.useAuth = true;
	}

	/**
     *
     * @param {string} registryHost
     */
	setHost(registryHost) {
		this.registryHost = registryHost;
	}

	/**
     *
     * @param {string} imageName
     */
	setImageName(imageName) {
		checkImageName(imageName);
		this.imageName = imageName;
	}

	/**
     *
     * @param {string} registryAPIVersion
     */
	setVersion(registryAPIVersion) {
		this._registryAPIVersion = registryAPIVersion;
	}

	/**
     *
	 * @param {boolean} useToken - default: true
     * @param {string} token
     * @return {string[]}
     */
	buildHeaders(useToken = true, token = '') {
		const headers = [
			'Accept', 'application/vnd.docker.distribution.manifest.v2+json',
		];
		if (useToken) {
			headers.push('Authorization', `Bearer ${token}`);
		}

		return headers;
	}

	/**
     *
     * @param {string} imageName
     */
	async getTokenFromAuthService(imageName) {
		checkImageName(imageName);
		if (!this.useAuth || this.authHost === '') {
			throw new Error('Attempted to call the auth service before setting it');
		}

		// Update image name
		this.setImageName(imageName);

		if (!this.isTokenValid(imageName)) {
			const scope = `repository:${imageName}:pull`;

			const url = `https://${this.authHost}/token?service=${this.authService}&scope=${scope}`;

			const apiResponse = await request(url);

			if ([200, 301].includes(apiResponse.statusCode) !== true) {
				throw new Error(`HTTP error! Status: ${apiResponse.statusCode}`);
			}

			/** @type {{ token: string, expires_in: string, issued_at: string }} */
			const responseJSON = await apiResponse.body.json();

			const {token, expires_in: expiresInSeconds, issued_at: issued} = responseJSON;

			this.tokenData[imageName] = {
				token,
				issued,
				expiry: Number.parseInt(expiresInSeconds, 10),
			};
		}

		this.useAuth = true;
		return this.tokenData.token;
	}

	/**
	 * @external undici.Dispatcher.ResponseData
	 * @see {@link https://github.com/nodejs/undici/blob/main/docs/api/Dispatcher.md#parameter-responsedata}
	  */

	/**
     * Perform a fetch against the registry
     * @param {string} url
     * @param {boolean} shouldUseToken @default [true]
     * @return {Promise<Dispatcher.ResponseData>}
     * @throws {Error} If the response code is not successfull
     */
	async callRaw(url, shouldUseToken = true) {
		await this.getTokenFromAuthService(this.imageName);

		const requestHeaders = this.buildHeaders(shouldUseToken, this.tokenData[this.imageName].token);

		const apiResponse = await request(url, {headers: requestHeaders, maxRedirections: 1});

		if ([200, 301].includes(apiResponse.statusCode) !== true) {
			console.dir(apiResponse.headers);
			throw new Error(`HTTP error! Status: ${apiResponse.statusCode}`);
		}

		return apiResponse;
	}

	/**
 *
 * @param {OCIImageManifest} manifest
 * @param {number} index
 * @param {string} layerSHA
 * @param {string} tag
 */
	async extractLayer(manifest, index, layerSHA, tag) {
		const url = buildURL({
			host: this.getHost(),
			version: this.getVersion(),
			namespace: this.getImageName(),
			endpoint: 'blobs',
			reference: layerSHA,
		});

		console.log(`pulling layer: ${layerSHA}`);

		const apiResponse = await this.callRaw(url);

		const bodyBits = Buffer.from(await apiResponse.body.arrayBuffer());

		if (typeof bodyBits === 'undefined') {
			throw new TypeError('Body has no content!');
		}

		const bodyBuffer = Buffer.from(bodyBits);

		console.log(`Gzipped length: ${bodyBuffer.byteLength}`);

		let filePath = `tmp/${this.getImageName()}/${sanitize(tag)}`;

		mkdirSync(filePath, {recursive: true});

		filePath = `${filePath}/${index}_${layerSHA}`;

		if (bodyBuffer.byteLength === 32) {
			await writeFile(`${filePath}.empty`, Buffer.alloc(0));
		} else {
			await writeFile(`${filePath}.gz`, bodyBuffer);

			const unGZippedBlob = gunzipSync(bodyBuffer);

			console.log(`Ungzipped length: ${unGZippedBlob.byteLength}`);

			try {
				Stream.Readable.from(unGZippedBlob).pipe(extract(filePath, {
					dmode: 0o555, // All dirs should be readable
					fmode: 0o444, // All files should be readable
				}));
			} catch (error) {
				throw new Error(`Error extracting: ${String(error)}`);
			}
		}
	}

	/**
	 * Fetch a manifest from the registry by it's digest
	 * @param {string} digest
	 * @returns {Promise<OCIImageManifest>}
	 */
	async fetchManifestByDigest(digest) {
		const url = buildURL({
			host: this.getHost(),
			version: this.getVersion(),
			namespace: this.getImageName(),
			endpoint: 'blobs',
			reference: digest,
		});

		console.log(`Request URL: ${url}`);

		const apiResponse = await this.callRaw(url);

		console.log(`Content type: ${apiResponse.headers['content-type']}`);

		return apiResponse.body.json();
	}

	/**
	 *
	 * @param {string} tag
	 * @returns {Promise<OCIImageManifest>}
	 */
	async fetchImageManifestForTag(tag) {
		const url = buildURL({
			host: this.getHost(),
			version: this.getVersion(),
			namespace: this.getImageName(),
			endpoint: 'manifests',
			reference: tag,
		});

		console.log(`Request URL: ${url}`);

		const apiResponse = await this.callRaw(url);

		console.log(`Content type: ${apiResponse.headers['content-type']}`);

		if (apiResponse.headers['content-type'] !== 'application/vnd.docker.distribution.manifest.v2+json') {
			throw new Error('Not able to pull a signed manifest');
		}

		return apiResponse.body.json();
	}

	/**
	 * Fetch list of tags for image from registry
	 * @returns {Promise<string[]>}
	 */
	async fetchImageTags() {
		const url = buildURL({
			host: this.getHost(),
			version: this.getVersion(),
			namespace: this.getImageName(),
			endpoint: 'tags/list',
			reference: '',
		});

		console.log(`Request URL: ${url}`);

		const apiResponse = await this.callRaw(url);

		console.log(`Content type: ${apiResponse.headers['content-type']}`);

		const {tags} = await apiResponse.body.json();

		return tags || [];
	}
}

/**
 * Validate an image name strict is set and not empty
 * @param {string} imageName
 * @thows {Error} Image name is not set
 */
export function checkImageName(imageName) {
	if (imageName.length === 0 || typeof imageName === 'undefined') {
		throw new Error('Image name is not set');
	}

	if (imageName.includes(':')) {
		throw new Error('Pass only the org/name, not the tag.');
	}

	if (!imageName.includes('/')) {
		throw new Error('Pass both org and repo in the form of org/name.');
	}
}

/**
 * Validate a host does not contain protocol or port segments
 * @param {string} registryHost
 * @thows {Error} Pass only the host, not the protocol or port
 */
export function checkHostURL(registryHost) {
	if (registryHost.includes(':')) {
		throw new Error('Pass only the host, not the protocol or port');
	}
}

/**
 * Used by {@link buildURL}
 * @typedef {Object} BuildOptions
 * @prop {string} host
 * @prop {string} version
 * @prop {string} namespace
 * @prop {string} endpoint
 * @prop {string} reference
 */

/**
 * Build a url string suitable for {@link ContainerRegistryClient.callRaw}
 * @param {BuildOptions} buildOptions
 * @return {string}
 */
export function buildURL({host, version, namespace, endpoint, reference}) {
	return `https://${host}/${version}/${namespace}/${endpoint}/${reference}`;
}
