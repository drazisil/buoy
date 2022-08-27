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

import { DOCKER_API_BASE, DOCKER_AUTH_BASE } from './constants.js';

/**
 * @typedef {object} APIResponseJSON
 * @prop {string} [token]
 */

/**
 * Call a registry API endpoint with token
 * @param {string} namespace 
 * @param {string} token 
 * @param {string} endpoint 
 * @return {Promise<APIResponseJSON>
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

    return await apiResponse.json()
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
    throw new Error(`HTTP error! Status: ${response.status}`);
}

/** @type {{ token: string }} */
const responseJSON = await apiResponse.json()

const token = responseJSON.token

const response = await getAPIAuthenticated(imageName, token, "/tags/list")

console.dir(response)
