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

import {request} from 'undici';

/**
 * Used by {@link ContainerRegistryClient.setAuthOptions}
 * @global
 * @typedef {Object} AuthOptions
 * @prop {string} authHost
 * @prop {string} authService
 */

/**
 * @classdesc A generic container registry client
 * Supports reading
 */
export class ContainerRegistryClient {
	#registryHost;
	#registryVersion;
	/** @type {Record<string, { token: string, issued: string, expiry: number }>} */
	#tokenData;
	#useAuth = false;
	#imageName = '';
	#authHost = '';
	#authService = '';

	/**
     *
     * @param {string} registryHost
     * The URL of the registry, without protocol or port
     * @param {AuthOptions} [authOptions]
     * An optional object containg the host and service for auth
     */
	constructor(registryHost, authOptions = undefined) {
		checkHostURL(registryHost);
		this.#registryHost = registryHost;
		this.#registryVersion = 'v2';
		this.#authService = registryHost;
		if (typeof authOptions !== 'undefined') {
			this.#authHost = authOptions.authHost;
			this.#authService = authOptions.authService;
		}

		this.#tokenData = {};
	}

	/**
     *
     * @param {string} registryAPIVersion
     */
	setVersion(registryAPIVersion) {
		this._registryAPIVersion = registryAPIVersion;
	}

	/**
     * @return {string} The version of the registry schema we will use
     */
	get version() {
		return this.#registryVersion;
	}

	/**
     *
     * @param {string} imageName
     */
	setImageName(imageName) {
		checkImageName(imageName);
		this.#imageName = imageName;
	}

	/**
     * @return {string}
     */
	get imageName() {
		return this.#imageName;
	}

	/**
     *
     * @param {string} registryHost
     */
	setHost(registryHost) {
		this.#registryHost = registryHost;
	}

	/**
     * @return {string}
     */
	get host() {
		return this.#registryHost;
	}

	/**
     *
     * @param {boolean} useToken - default: true
     * @param {string} token
     * @return {string[][]}
     */
	#buildHeaders(useToken = true, token = '') {
		const headers = [
			'Docker-Distribution-API-Version', `registry/${this.#registryVersion}`,
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
	async #getTokenFromAuthService(imageName) {
		checkImageName(imageName);
		if (!this.#useAuth || this.#authHost === '') {
			throw new Error('Attempted to call the auth service before setting it');
		}

		// Update image name
		this.setImageName(imageName);

		if (!this.isTokenValid(imageName)) {
			const scope = `repository:${imageName}:pull`;

			const url = `https://${this.#authHost}/token?service=${this.#authService}&scope=${scope}`;

			const apiResponse = await request(url);

			if ([200, 301].includes(apiResponse.statusCode) !== true) {
				throw new Error(`HTTP error! Status: ${apiResponse.statusCode}`);
			}

			/** @type {{ token: string, expires_in: string, issued_at: string }} */
			const responseJSON = await apiResponse.body.json();

			const {token, expires_in: expiresInSeconds, issued_at: issued} = responseJSON;

			this.#tokenData[imageName] = {
				token,
				issued,
				expiry: Number.parseInt(expiresInSeconds, 10),
			};
		}

		this.#useAuth = true;
		return this.#tokenData.token;
	}

	/**
     *
     * @param {AuthOptions} authOptions
     */
	setAuthOptions({authHost, authService}) {
		checkHostURL(authHost);
		this.#authHost = authHost;
		this.#authService = authService;
		this.#useAuth = true;
	}

	/**
     *
     * @param {string} imageName
     * @returns {boolean} If the current timestamp is greater then the expiry
     */
	isTokenValid(imageName) {
		if (typeof this.#tokenData[imageName] === 'undefined') {
			return false;
		}

		const issuedDate = new Date(this.#tokenData[imageName].issued);
		const expiryDate = issuedDate.setSeconds(issuedDate.getSeconds() + this.#tokenData[imageName].expiry);
		return Date.now() < expiryDate;
	}

	/**
     * Perform a fetch against the registry
     * @param {string} url
     * @param {boolean} shouldUseToken @default [true]
     * @return {Promise<Response>} Promise object of a {@link Response}
     * @throws {Error} If the response code is not successfull
     */
	async callRaw(url, shouldUseToken = true) {
		await this.#getTokenFromAuthService(this.#imageName);

		const requestHeaders = this.#buildHeaders(shouldUseToken, this.#tokenData[this.#imageName].token);

		const apiResponse = await request(url, {headers: requestHeaders, maxRedirections: 1});

		if ([200, 301].includes(apiResponse.statusCode) !== true) {
			console.dir(apiResponse.headers);
			throw new Error(`HTTP error! Status: ${apiResponse.statusCode}`);
		}

		return apiResponse;
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
