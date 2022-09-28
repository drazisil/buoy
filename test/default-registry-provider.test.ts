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

import assert from 'node:assert';
import type {MockClient} from 'undici';
import {MockAgent, setGlobalDispatcher} from 'undici';
import {DefaultRegistryProvider} from '../src/provider/default-registry-provider.js';

describe('ContainerRegistryClient', () => {
	let mockAgent: MockAgent;
	let mockClient: MockClient;
	let registryHost: string;

	beforeEach(() => {
		mockAgent = new MockAgent({connections: 1});
		mockAgent.disableNetConnect();
		setGlobalDispatcher(mockAgent);
	});

	describe('#setImageName', () => {
		it('should throw when passed an invalid image name', async () => {
			// Arrange
			const client = new DefaultRegistryProvider('NotAHost');
			const imageName = 'exampleImageName';

			// Assert
			try {
				await client.setImageName(imageName);
				assert.fail('Should have thrown an error');
			} catch (error: unknown) {
				// Assert
				assert.match(String(error), /Pass both org and repo in the form of org/);
			}
		});

		it('should set the image name', async () => {
			// Arrange
			const client = new DefaultRegistryProvider('NotAHost');
			const imageName = 'exampleOrgName/exampleImageName';

			// Act
			await client.setImageName(imageName);

			// Assert
			assert.equal(client.imageName, imageName);
		});
	});

	describe('#fetchManifestByDigest', () => {
		it('should return an OCIImageManifest object', async () => {
			// Arrange
			const imageName = 'exampleOrgName/exampleImageName';
			registryHost = 'docker.host.local';
			mockClient = mockAgent.get(`https://${registryHost}`);
			mockClient.intercept({
				method: 'GET',
				path: '/v2/exampleOrgName/exampleImageName/blobs/abc123',
			}).reply(200, 'testPOSTHTTP', {
				headers: {'content-type': 'application/octet-stream'},
			});
			const client = new DefaultRegistryProvider(registryHost);
			await client.setImageName(imageName);

			// Act
			const result = await client.fetchManifestByDigest('abc123');

			// Assert
			assert.ok(typeof result.layers !== 'undefined');
		});
	});

	describe('#fetchImageManifestForTag', () => {
		it('should return an OCIImageManifest object', async () => {
			// Arrange
			const client = new DefaultRegistryProvider('NotAHost');
			const imageName = 'exampleOrgName/exampleImageName';

			// Act
			const result = await client.fetchImageManifestForTag(imageName);

			// Assert
			assert.ok(typeof result.layers !== 'undefined');
		});
	});

	describe('#fetchImageTags', () => {
		it('should return an array of strings', async () => {
			// Arrange
			const client = new DefaultRegistryProvider('NotAHost');
			const imageName = 'exampleOrgName/exampleImageName';

			// Act
			const result = await client.fetchImageTags();

			// Assert
			assert.equal(result.length, 3);
		});
	});
});
