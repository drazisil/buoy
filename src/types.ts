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
 * @see {@link https://github.com/opencontainers/image-spec/blob/e67f056ed21bd4d7360f3bed5ee393b0682eafe7/descriptor.md}
 * @global
 * @typedef {Object} OCIContentDescriptor
 * @prop {string} mediaType
 * @prop {string} digest
 * @prop {number} size
 * @prop {string[]} [urls]
 * @prop {Record<string, string>} [annotations]
 * @prop {string} [data]
 * @prop {string} [artifactType]
 */
export type OCIContentDescriptor = {
	mediaType: string;
	digest: string;
	size: number;
	urls?: string[];
	annotations?: Record<string, string>;
	data?: string;
	artifactType?: string;
};

/**
 * @see {@link https://github.com/opencontainers/image-spec/blob/e67f056ed21bd4d7360f3bed5ee393b0682eafe7/manifest.md}
 * @global
 * @typedef {Object} OCIImageManifest
 * @prop {number} schemaVersion
 * @prop {string} mediaType
 * @prop {OCIContentDescriptor} config
 * @prop {OCIContentDescriptor[]} layers
 * @prop {OCIContentDescriptor} [subject]
 * @prop {Record<string, string>} [annotations]
 */
export type OCIImageManifest = {
	schemaVersion: number;
	mediaType: string;
	config: Record<string, string>;
	layers: OCIContentDescriptor[];
	subject?: Record<string, string>;
	annotations?: Record<string, string>;
};

export type OCIImageConfigurationHealthCheck = Record<string, unknown>;

/**
 * @global
 * @typedef {Object} OCIImageConfigurationRootFS
 * @prop {"layers"} type
 * @prop {string[]} diff_ids
 */
export type OCIImageConfigurationRootFS = {
	type: 'layers';
	diff_ids: string[];
};

/**
 * Used by {@link OCIImageConfigurationConfig}
 * @global
 * @typedef {Object} OCIImageConfigurationHistory
 * @prop {string} [created]
 * @prop {string} [auhor]
 * @prop {string} [created_by]
 * @prop {string} [comment]
 * @prop {boolean} [empty_layer]
 */
export type OCIImageConfigurationHistory = {
	created?: string;
	auhor?: string;
	created_by?: string;
	comment?: string;
	empty_layer?: boolean;
};

/**
 * @global
 * @typedef {Object} OCIImageConfigurationConfig
 * @prop {string} [User]
 * @prop {string} [ExposedPorts]
 * @prop {string[]} [Env]
 * @prop {string[]} [Entrypoint]
 * @prop {string[]} [Cmd]
 * @prop {Record<string, {}>} [Volumes]
 * @prop {string} [WorkingDir]
 * @prop {Record<string, string>} [Labels]
 * @prop {string} [StopSignal]
 * @prop {number} [Memory]
 * @prop {number} [MemorySwap]
 * @prop {number} [CpuShares]
 * @prop {{}} [HealthCheck]
 * @prop {OCIImageConfigurationRootFS} rootfs
 * @prop {OCIImageConfigurationHistory[]} [history]
 */
export type OCIImageConfigurationConfig = {
	User?: string;
	ExposedPorts?: string[];
	Env?: string[];
	Entrypoint?: string[];
	Cmd?: string[];
	Volumes?: Record<string, unknown>;
	WorkingDir?: string;
	Labels?: string[];
	StopSignal?: string;
	Memory?: number;
	MemorySwap?: number;
	CpuShares?: number;
	HealthCheck?: OCIImageConfigurationHealthCheck;
	OCIImageConfigurationRootFS?: OCIImageConfigurationRootFS;
	History?: OCIImageConfigurationHistory[];
};

/**
 * @see {@link https://github.com/opencontainers/image-spec/blob/e67f056ed21bd4d7360f3bed5ee393b0682eafe7/config.md}
 * @global
 * @typedef {Object} OCIImageConfiguration
 * @prop {string} [created]
 * @prop {string} [author]
 * @prop {string} architecture
 * @prop {string} os
 * @prop {string} [os.version]
 * @prop {string[]} [os.features]
 * @prop {string} [variant]
 * @prop {OCIImageConfigurationConfig} [config]
 */
export type OCIImageConfiguration = {
	created?: string;
	author?: string;
	architecture?: string;
	os: string;
	'os.version'?: string;
	'os.features'?: string[];
	variant?: string;
	config?: OCIImageConfigurationConfig;
};

export type OCIImageLayer = Buffer;

/**
 * Token used to access the registry
 * @date 9/27/2022 - 6:32:49 PM
 *
 * @export
 * @typedef {AuthTokenData}
 */
export type AuthTokenData = {
	token: string;
	issued: string;
	expiry: number;
};

export type IRegistryConnectionProvider = {
	readonly registryHost: string;
	readonly registryUsesAuthentication: boolean;
	fetchImageManifestForTag: (tag: string) => Promise<OCIImageManifest>;
	fetchImageTags: () => Promise<string[]>;
	fetchLayerFromRegistry: (manifest: OCIImageManifest, index: number, layerSHA: string, tag: string) => Promise<void>;
	fetchManifestByDigest: (digest: string) => Promise<OCIImageManifest>;
	getTokenFromAuthService: (imageName: string) => Promise<{token: string; issued: string; expiry: number}>;
	getTagsFromRegistry: (imageName: string, tokenData: AuthTokenData) => Promise<string[]>;
	getImageManifestFromRegistry: (imageName: string, reference: string, tokenData: AuthTokenData) => Promise<OCIImageManifest>;
	getImageManifestFromRegistryByDigest: (imageName: string, digest: string, tokenData: AuthTokenData) => Promise<OCIImageManifest>;
	getImageConfigurationFromRegistry: (imageName: string, tokenData: AuthTokenData) => Promise<OCIImageConfiguration>;
	getLayerFromRegistry: (imageName: string, layerSHA: string, tokenData: AuthTokenData) => Promise<OCIImageLayer>;
	imageName: string;
	isTokenValid: () => boolean;
	setImageName: (imageName: string) => Promise<void>;
};

/**
 * @global
 * @typedef {Object} AuthOptions
 * @prop {string} authHost
 * @prop {string} authService
 */
export type AuthOptions = {
	usingAuth: boolean;
	authHost: string;
	authService: string;
};

export type RegistryConfiguration = {
	title: string;
	host: string;
	usesDefaultProvider: boolean;
	customRegistryProvider?: IRegistryConnectionProvider;
	authOptions: AuthOptions;
};
