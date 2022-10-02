import { DockerRegistryProvider } from './docker-registry-provider.js';
export { DefaultRegistryProvider } from './default-registry-provider.js';
export const registryConfigurations = [
    {
        title: 'registry.docker.com',
        host: 'registry.docker.com',
        usesDefaultProvider: false,
        customRegistryProvider: new DockerRegistryProvider(),
        authOptions: {
            usingAuth: true,
            authHost: 'https://auth.docker.io',
            authService: 'registry.docker.io',
        },
    },
    {
        title: 'us-docker.pkg.dev',
        host: 'us-docker.pkg.dev',
        usesDefaultProvider: true,
        authOptions: {
            usingAuth: false,
            authHost: '',
            authService: '',
        },
    },
];
