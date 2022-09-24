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
import {buildURL, checkHostURL, checkImageName} from '../src/index.js';

describe('buildURL', () => {
	it('builds a URL', () => {
		assert.equal(buildURL({
			host: 'https://host.local',
			version: 'v6',
			namespace: 'test/image',
			endpoint: 'tags',
			reference: 'foo'}), 'https://https://host.local/v6/test/image/tags/foo');
	});
});

describe('checkHostURL', () => {
	it('checks the host URL', () => {
		assert.throws(() => {
			checkHostURL('https://local');
		}, /protocol/);
	});
});

describe('checkImageName', () => {
	it('checks the image name is not empty', () => {
		assert.throws(() => {
			checkImageName('');
		}, /not set/);
	});

	it('checks the image name contains both org and repo name', () => {
		assert.throws(() => {
			checkImageName('test');
		}, /Pass both org and repo in the form of org\/name./);
	});

	it('checks the image name does not contain the reference', () => {
		assert.throws(() => {
			checkImageName('test/repo:ref');
		}, /Pass only the org\/name, not the tag./);
	});
});

