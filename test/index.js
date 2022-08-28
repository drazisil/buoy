// Buoy is a image layer scanner
// Copyright (C) 2000  Drazi Crendraven
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

import assert from "assert"
import { buildURL, checkHostURL, checkImageName } from "../lib/containerRegistryClient.js"

assert.equal(buildURL("https://host.local", "v6", "test/image", "tags", "foo"), "https://https://host.local/v6/test/image/tags/foo")

assert.throws(() => { checkHostURL("https://local")}, /protocol/)

assert.throws(() => { checkImageName("")}, /not set/)