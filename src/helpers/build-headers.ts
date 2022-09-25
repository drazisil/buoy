/**
	 *
	 * @param {boolean} useToken - default: true
	 * @param {string} token
	 * @return {string[]}
	 */

export function buildHeaders(useToken = true, token = ''): string[] {
	const headers = [
		'Accept', 'application/vnd.docker.distribution.manifest.v2+json',
	];
	if (useToken) {
		headers.push('Authorization', `Bearer ${token}`);
	}

	return headers;
}
