/**
 * Build a url string suitable for {@link ContainerRegistryClient.callRaw}
 * @param {BuildOptions} buildOptions
 * @return {string}
 */
export function buildURL({ host, version, namespace, endpoint, reference }) {
    return `https://${host}/${version}/${namespace}/${endpoint}/${reference}`;
}
