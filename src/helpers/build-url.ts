
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
