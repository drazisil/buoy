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
import {checkImageName} from './helpers/check-image-name.js';

import type {AuthTokenData, IRegistryConnectionProvider, OCIImageManifest} from './types.js';

/** @module ContainerRegistryClient */

/**
 * A generic container registry client
 *
 * Supports reading
 */
export class ContainerRegistryClient {
	public static newWithProvider(registryConnectionProvider: IRegistryConnectionProvider): ContainerRegistryClient {
		return new ContainerRegistryClient(registryConnectionProvider);
	}

	imageName: string;
	registryConnectionProvider: IRegistryConnectionProvider | undefined = undefined;
	registryUsesAuthentication = false;
	tokenData: AuthTokenData = {
		token: '',
		issued: '',
		expiry: 0,
	};

	private constructor(registryConnectionProvider: IRegistryConnectionProvider) {
		this.registryConnectionProvider = registryConnectionProvider;
	}

	/**
     * @return {string}
     */
	getHost(): string {
		return this.registryConnectionProvider.registryHost;
	}

	/**
     * @return {string}
     */
	getImageName(): string {
		return this.imageName;
	}

	/**
     *
     * @param {string} imageName
     * @returns {boolean} If the current timestamp is greater then the expiry
     */
	isTokenValid(): boolean {
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
	async setImageName(imageName: string) {
		checkImageName(imageName);
		this.imageName = imageName;
		await this.updateTokenFromAuthServiceIfNeeded(imageName);
	}

	/**
	 * @external undici.Dispatcher.ResponseData
	 * @see {@link https://github.com/nodejs/undici/blob/main/docs/api/Dispatcher.md#parameter-responsedata}
	  */

	async fetchLayerFromRegistry(manifest: OCIImageManifest, index: number, layerSHA: string, tag: string) {
		const bodyBuffer = await this.registryConnectionProvider.getLayerFromRegistry(this.getImageName(), layerSHA, this.tokenData);

		console.log(`Gzipped length: ${bodyBuffer.byteLength}`);

		const filePath = `tmp/${this.getImageName()}/${sanitize(tag)}`;

		mkdirSync(filePath, {recursive: true});

		const layerFilePath = `${filePath}/${index}_${layerSHA}`;

		await writeLayerToFS(layerFilePath, bodyBuffer);
	}

	/**
	 * Fetch a manifest from the registry by it's digest
	 * @param {string} digest
	 * @returns {Promise<OCIImageManifest>}
	 */
	async fetchManifestByDigest(digest: string): Promise<OCIImageManifest> {
		return this.registryConnectionProvider.getImageManifestFromRegistryByDigest(this.getImageName(), digest, this.tokenData);
	}

	/**
	 *
	 * @param {string} tag
	 * @returns {Promise<OCIImageManifest>}
	 */
	async fetchImageManifestForTag(tag: string): Promise<OCIImageManifest> {
		return this.registryConnectionProvider.getImageManifestFromRegistry(this.getImageName(), tag, this.tokenData);
	}

	/**
	 * Fetch list of tags for image from registry
	 * @returns {Promise<string[]>}
	 */
	async fetchImageTags(): Promise<string[]> {
		return this.registryConnectionProvider.getTagsFromRegistry(this.imageName, this.tokenData);
	}

	/**
     *
     * @param {string} imageName
     */
	private async updateTokenFromAuthServiceIfNeeded(imageName: string): Promise<void> {
		if (!this.isTokenValid()) {
			this.tokenData = await this.registryConnectionProvider.getTokenFromAuthService(imageName);
		}
	}
}

async function writeLayerToFS(filePath: string, bodyBuffer: Buffer): Promise<void> {
	if (bodyBuffer.byteLength === 32) {
		await writeFile(`${filePath}.empty`, Buffer.alloc(0));
	} else {
		await writeFile(`${filePath}.gz`, bodyBuffer);

		const unGZippedBlob = gunzipSync(bodyBuffer);

		console.log(`Ungzipped length: ${unGZippedBlob.byteLength}`);

		try {
			Stream.Readable.from(unGZippedBlob).pipe(extract(filePath, {
				dmode: 0o555,
				fmode: 0o444, // All files should be readable
			}));
		} catch (error: unknown) {
			throw new Error(`Error extracting: ${String(error)}`);
		}
	}
}

