
export function buildAuthURL(host: string, queryParameters: Record<string, string>): string {
	const iurl = new URL('token', host);

	for (const queryParameter in queryParameters) {
		if (Object.prototype.hasOwnProperty.call(queryParameters, queryParameter)) {
			iurl.searchParams.set(queryParameter, queryParameters[queryParameter]);
		}
	}

	const url = iurl.toString();
	console.log(`Request URL: ${url}`);

	return url;
}
