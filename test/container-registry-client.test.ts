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
import {ContainerRegistryClient} from '../src/container-registry-client.js';
import {MockRegistryConnectionProvider} from './mock-registry-connection-provider.test.js';

describe('ContainerRegistryClient', () => {
	it('should return a ContainerRegistryClient instance', () => {
		// Arrange
		const mockProvider = new MockRegistryConnectionProvider();

		// Act
		const client = ContainerRegistryClient.newWithProvider(mockProvider);

		// Assert
		assert.equal(client.getHost(), 'http://localhost:8080');
	});

	describe('#setImageName', () => {
		it('should throw when passed an invalid image name', async () => {
			// Arrange
			const mockProvider = new MockRegistryConnectionProvider();
			const client = ContainerRegistryClient.newWithProvider(mockProvider);
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
			const mockProvider = new MockRegistryConnectionProvider();
			const client = ContainerRegistryClient.newWithProvider(mockProvider);
			const imageName = 'exampleOrgName/exampleImageName';

			// Act
			await client.setImageName(imageName);

			// Assert
			assert.equal(client.getImageName(), imageName);
		});
	});
});
