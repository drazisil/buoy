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
import {inspect} from 'node:util';
import createDebugLogger from 'debug';

const debug = createDebugLogger('buoy');

export function buildAuthURL(host: string, queryParameters: Record<string, string>): string {
	debug(`URL parts: ${host}, ${inspect(queryParameters)}`);
	const iurl = new URL('token', `https://${host}`);

	for (const queryParameter in queryParameters) {
		if (Object.prototype.hasOwnProperty.call(queryParameters, queryParameter)) {
			iurl.searchParams.set(queryParameter, queryParameters[queryParameter]);
		}
	}

	const url = iurl.toString();
	console.log(`Request URL: ${url}`);

	return url;
}
