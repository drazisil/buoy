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
/**
 * Validate an image name string is set and not empty
 * @param {string} imageName
 * @thows {Error} Image name is not set
 */
export function checkImageName(imageName) {
    if (imageName.length === 0 || typeof imageName === 'undefined') {
        throw new Error('Image name is not set');
    }
    if (imageName.includes(':')) {
        throw new Error('Pass only the org/name, not the tag.');
    }
    if (!imageName.includes('/')) {
        throw new Error('Pass both org and repo in the form of org/name.');
    }
}
