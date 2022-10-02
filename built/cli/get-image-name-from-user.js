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
export async function getImageNameFromUser() {
    const choice = await prompts({
        type: 'text',
        name: 'imageNameChoice',
        message: 'Enter the image name (org/name):',
        initial: '',
    });
    const imageNameChoice = choice.imageNameChoice;
    if (typeof imageNameChoice === 'undefined') {
        throw new TypeError('Please pass the image name!');
    }
    return imageNameChoice;
}
