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
