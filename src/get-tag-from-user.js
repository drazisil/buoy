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

import prompts from 'prompts';

/**
 *
 * @param {Array<{title: string}>} choices
 * @returns {Promise<string>}
 */
export async function getTagfromUser(choices) {
	const tagSelect = await prompts({
		type: 'select',
		name: 'selectedTag',
		message: 'Select a tag:',
		choices,
		initial: 1,
	});
	const {selectedTag} = tagSelect;
	if (typeof selectedTag === 'undefined') {
		throw new TypeError('You didn\'t select a tag');
	}

	console.log(`Selected tag: ${choices[selectedTag].title}`);
	return choices[selectedTag].title;
}
