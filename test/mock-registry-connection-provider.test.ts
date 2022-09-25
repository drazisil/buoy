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
import type {AuthTokenData, IRegistryConnectionProvider, OCIImageConfiguration, OCIImageManifest} from '../src/types';
import {mockImageManifest} from './mock-image-menifest.test.js';

export class MockRegistryConnectionProvider implements IRegistryConnectionProvider {
	registryHost = 'http://localhost:8080';
	registryUsesAuthentication: boolean;
	async getTokenFromAuthService(imageName?: string | undefined): Promise<{token: string; issued: string; expiry: number}> {
		return {token: 'notAToken', issued: '01/01/1978', expiry: 0};
	}

	async getTagsFromRegistry(imageName: string, tokenData: AuthTokenData): Promise<string[]> {
		return ['tag1', 'tag2', 'tag2'];
	}

	async getImageManifestFromRegistry(imageName: string, reference: string, tokenData: AuthTokenData): Promise<OCIImageManifest> {
		return mockImageManifest;
	}

	async getImageManifestFromRegistryByDigest(imageName: string, digest: string, tokenData: AuthTokenData): Promise<OCIImageManifest> {
		return mockImageManifest;
	}

	async getImageConfigurationFromRegistry(imageName: string, tokenData: AuthTokenData): Promise<OCIImageConfiguration> {
		throw new Error('Not implemented');
	}

	async getLayerFromRegistry(imageName: string, layerSHA: string, tokenData: AuthTokenData): Promise<Buffer> {
		return Buffer.from('Hello! I am an example layer');
	}
}
