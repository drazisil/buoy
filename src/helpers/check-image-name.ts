/**
 * Validate an image name string is set and not empty
 * @param {string} imageName
 * @thows {Error} Image name is not set
 */

export function checkImageName(imageName: string) {
	if (imageName.length === 0 || typeof imageName === 'undefined') {
		throw new Error('Image name is not set');
	}

	if (imageName.includes(':')) {
		throw new Error('Pass only the org/name, not the tag.');
	}

	if (!imageName.includes('/')) {
		throw new Error('Pass both org and repo in the form of org/name.');
	}
}
