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
 * Prompt the user for image name
 * @returns {Promise<string>}
 */
export async function pickRegistryFromUser(choices) {
    const choice = await prompts({
        type: 'select',
        name: 'selectedRegistry',
        message: 'Select the registry:',
        choices,
        initial: 0,
    });
    const selectedRegistry = choice.selectedRegistry;
    if (typeof selectedRegistry === 'undefined') {
        throw new TypeError('You didn\'t select a registry');
    }
    const selectedTagTitle = choices[selectedRegistry].title;
    console.log(`Selected registry: ${selectedTagTitle}`);
    return choices[selectedRegistry];
}
