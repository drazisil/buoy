
/**
 * Used by {@link buildURL}
 * @typedef {Object} BuildOptions
 * @prop {string} host
 * @prop {string} version
 * @prop {string} namespace
 * @prop {string} endpoint
 * @prop {string} reference
 */
export type BuildOptions = {
	host: string;
	version: string;
	namespace: string;
	endpoint: string;
	reference: string;
};

/**
 * Build a url string suitable for {@link ContainerRegistryClient.callRaw}
 * @param {BuildOptions} buildOptions
 * @return {string}
 */

export function buildURL({host, version, namespace, endpoint, reference}: BuildOptions): string {
	return `https://${host}/${version}/${namespace}/${endpoint}/${reference}`;
}
