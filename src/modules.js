import { contains, merge } from 'nanoutils'
import fs from 'fs'
import Module from 'module'
import path from 'path'

function getDirectories(srcPath) {
  // Slow synchronous version of https://github.com/megawac/lodash-modularize/blob/master/src/lodashModules.js.
  // Using the paths lodash-cli provides is not an option as they may change version to version =(
  return ['.']
    .concat(fs.readdirSync(srcPath))
    .filter(filePath => fs.statSync(path.join(srcPath, filePath)).isDirectory())
}

const _nanoutilsPath = path.dirname(
  Module._resolveFilename(
    'nanoutils',
    merge(new Module(), {
      paths: Module._nodeModulePaths(process.cwd())
    })
  )
)

// nanoutils folder will be /nodemodules/nanoutils/dist. We want to remove the dist
const nanoutilsPath = _nanoutilsPath.slice(
  0,
  _nanoutilsPath.lastIndexOf('nanoutils') + 9
)

var methods = fs
  .readdirSync(path.join(nanoutilsPath, 'lib'))
  .map(name => path.basename(name))

export default function resolveModule(name) {
  for (var category in methods) {
    if (contains(name, methods)) {
      return `nanoutils/lib/${name}`
    }
  }
  throw new Error(`Nanoutils method ${name} was not a known function
    Please file a bug if it's my fault https://github.com/megawac/babel-plugin-nanoutils/issues
  `)
}
