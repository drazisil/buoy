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
import {buildAuthURL} from '../src/helpers/build-auth-url.js';

describe('buildAuthURL()', () => {
	it('should build a valid auth url', () => {
		// Arrange
		const expectedURL = 'https://test.local/token?a=1&b=2';

		// Act
		const results = buildAuthURL('test.local', {a: '1', b: '2'});

		// Assert
		assert.equal(results, expectedURL);
	});
});
