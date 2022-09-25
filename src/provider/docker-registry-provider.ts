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
import {buildHeaders} from '../helpers/build-headers.js';
import {buildAuthURL} from '../helpers/build-auth-url.js';
import {buildURL} from '../helpers/build-url.js';
import {callRaw} from '../helpers/call-raw.js';
import type {AuthTokenData, IRegistryConnectionProvider, OCIImageConfiguration, OCIImageManifest} from '../types.js';

/** @module DockerRegistryClient */

/**
 * @implements {IRegistryConnectionProvider}
 */
export class DockerRegistryProvider implements IRegistryConnectionProvider {
	registryHost = 'registry.docker.com';

	public get registryUsesAuthentication() {
		return true;
	}

	async getTokenFromAuthService(imageName?: string): Promise<{token: string; issued: string; expiry: number}> {
		const scope = `repository:${imageName}:pull`;
		const queryParameters = {service: 'registry.docker.io', scope};

		const iurl = buildAuthURL('https://auth.docker.io', queryParameters);

		console.log(`Request URL: ${iurl}`);

		const apiResponse = await request(iurl.toString(), {maxRedirections: 1});

		if (![200, 301, 302].includes(apiResponse.statusCode)) {
			throw new Error(`HTTP error! Status: ${apiResponse.statusCode}`);
		}

		type AuthServiceJSONResponse = {
			token: string;
			expires_in: string;
			issued_at: string;
		};

		/** @type {{ token: string, expires_in: string, issued_at: string }} */
		const responseJSON: {token: string; expires_in: string; issued_at: string} = await (apiResponse.body.json() as Promise<AuthServiceJSONResponse>);

		const {token, expires_in: expiresInSeconds, issued_at: issued} = responseJSON;

		return {
			token,
			issued,
			expiry: Number.parseInt(expiresInSeconds, 10),
		};
	}

	async getTagsFromRegistry(imageName: string, tokenData: AuthTokenData): Promise<string[]> {
		const url = buildURL({
			host: this.registryHost,
			version: 'v2',
			namespace: imageName,
			endpoint: 'tags/list',
			reference: '',
		});

		console.log(`Request URL: ${url}`);

		const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);

		const apiResponse = await callRaw(url, headers);

		console.log(`Content type: ${apiResponse.headers['content-type']}`);

		const {tags} = await apiResponse.body.json() as {tags: string[]};

		return tags;
	}

	async getImageManifestFromRegistry(imageName: string, reference: string, tokenData: AuthTokenData): Promise<OCIImageManifest> {
		const url = buildURL({
			host: this.registryHost,
			version: 'v2',
			namespace: imageName,
			endpoint: 'manifests',
			reference,
		});

		console.log(`Request URL: ${url}`);

		const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);

		const apiResponse = await callRaw(url, headers);

		console.log(`Content type: ${apiResponse.headers['content-type']}`);

		return await apiResponse.body.json() as OCIImageManifest;
	}

	async getImageManifestFromRegistryByDigest(imageName: string, digest: string, tokenData: AuthTokenData): Promise<OCIImageManifest> {
		const url = buildURL({
			host: this.registryHost,
			version: 'v2',
			namespace: imageName,
			endpoint: 'blobs',
			reference: digest,
		});

		console.log(`Request URL: ${url}`);

		const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);

		const apiResponse = await callRaw(url, headers);

		console.log(`Content type: ${apiResponse.headers['content-type']}`);

		if (apiResponse.headers['content-type'] !== 'application/octet-stream') {
			throw new Error('Not able to pull a signed manifest');
		}

		return apiResponse.body.json() as Promise<OCIImageManifest>;
	}

	async getImageConfigurationFromRegistry(imageName: string): Promise<OCIImageConfiguration> {
		throw new Error('Not implimented');
	}

	async getLayerFromRegistry(imageName: string, layerSHA: string, tokenData: AuthTokenData): Promise<Buffer> {
		const url = buildURL({
			host: this.registryHost,
			version: 'v2',
			namespace: imageName,
			endpoint: 'blobs',
			reference: layerSHA,
		});

		console.log(`pulling layer: ${layerSHA}`);

		const headers = buildHeaders(this.registryUsesAuthentication, tokenData.token);

		const apiResponse = await callRaw(url, headers);

		const bodyBits = Buffer.from(await apiResponse.body.arrayBuffer());

		if (typeof bodyBits === 'undefined') {
			throw new TypeError('Body has no content!');
		}

		return Buffer.from(bodyBits);
	}
}
