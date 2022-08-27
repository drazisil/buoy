// Buoy is a image layer scanner
// Copyright (C) 2000  Drazi Crendraven

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { writeFile } from 'fs/promises';
import { gunzipSync } from 'zlib';
import { BLOB_ENDPOINT, DOCKER_API_BASE, DOCKER_AUTH_BASE, MANIFEST_ENDPOINT } from './constants.js';

/**
 * @typedef {object} APIResponseJSON
 * @prop {string[]} [tags]
 * @prop {string} [token]
 * @prop {Array<{blobSum: string}>} [fsLayers]
 * @prop {number} [length]
 */

/**
 * 
 * @param {Response} response 
 * @return {Promise<APIResponseJSON>}
 */
export async function parseAPIResponseJSON(response) {
    return await response.json()
}



/**
 * Call a registry API endpoint with token
 * @param {string} namespace 
 * @param {string} token 
 * @param {string} endpoint 
 * @return {Promise<Response>}
 */
async function getAPIAuthenticated(namespace, token, endpoint) {
    const headers = [
        ["Authorization", `Bearer ${token}`]
    ]

    const url = DOCKER_API_BASE.concat(namespace, endpoint)

    console.log(url)

    const apiResponse = await fetch(url, { headers })

    if (!apiResponse.ok) {
        console.dir(apiResponse.headers)
        throw new Error(`HTTP error! Status: ${apiResponse.status}`);
    }

    return apiResponse
}

if (process.argv.length < 3) {
    throw new Error("Please pass the image name!")
}

const imageName = process.argv[2]

let scope = `repository:${imageName}:pull`

const url = "".concat(DOCKER_AUTH_BASE, scope)

console.log(url)

const apiResponse = await fetch(url)

if (!apiResponse.ok) {
    throw new Error(`HTTP error! Status: ${apiResponse.status}`);
}

/** @type {{ token: string }} */
const responseJSON = await apiResponse.json()

const token = responseJSON.token

let response = await parseAPIResponseJSON(await getAPIAuthenticated(imageName, token, "/tags/list"))

const tags = response.tags

if (typeof tags == "undefined" || tags.length < 1) {
    throw new Error("No tags found!")
}

const selectedTag = tags[0]

response = await parseAPIResponseJSON(await getAPIAuthenticated(imageName, token, `${MANIFEST_ENDPOINT}${selectedTag}`))

const fsLayers = response.fsLayers

if (typeof fsLayers === "undefined" || fsLayers.length < 2) {
    throw new Error("No layers found!")
}

console.dir(fsLayers)

const selectedlayer = fsLayers[1].blobSum

const responseStream = (await getAPIAuthenticated(imageName, token, `${BLOB_ENDPOINT}${selectedlayer}`)).body

if (responseStream === null) {
    throw new Error("There was no body!")
}

const bodyReader = responseStream.getReader()

const bodyBits = (await bodyReader.read()).value

if (typeof bodyBits  === "undefined") {
    throw new Error("Body has no content!")
}

const bodyBuffer = Buffer.from(bodyBits)

console.log(bodyBuffer.byteOffset)

await writeFile("temp.gz", bodyBuffer)

const unGZippedBlob = gunzipSync(bodyBuffer)

console.log(unGZippedBlob.byteLength)

/**
 * Holds the binary data for am image layer
 */
export class ImageLayer {
    /**
     * 
     * @param {string} blobSum 
     */
    constructor(blobSum) {
        this.blobSum = blobSum
        /** @type {Buffer} */
        this.blob = Buffer.alloc(0)
    }
}