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
import {request} from 'undici';
import type {Dispatcher} from 'undici';

/**
	 * Perform a fetch against the registry
	 * @param {string} url
	 * @param {string[]} headers
	 * @return {Promise<Dispatcher.ResponseData>}
	 * @throws {Error} If the response code is not successfull
	 */

export async function callRaw(url: string, headers: string[]): Promise<Dispatcher.ResponseData> {
	const apiResponse = await request(url, {headers, maxRedirections: 1});

	if (![200, 301, 302].includes(apiResponse.statusCode)) {
		console.error(apiResponse.statusCode);
		console.dir(headers);
		console.log(url);
		console.dir(apiResponse.headers);
		throw new Error(`HTTP error! Status: ${apiResponse.statusCode}`);
	}

	return apiResponse;
}
