import async from 'async'
import invariant from 'invariant'
import fse from 'fs-extra'
import path from 'path'
import cmdShim from 'cmd-shim'

export function dependencies(node, nodeBase, callback) {
    entriesFromDependencies(node, nodeBase, (err, entries) => {
        invariant(!err, 'Should never have error result')
        async.mapSeries(entries, link, callback)
    })
}

export function localPackages(node, callback) {
    entriesFromLocalPackages(node, (err, entries) => {
        invariant(!err, 'Should never have error result')
        async.mapSeries(entries, link, callback)
    })
}

/*
 * Produces:
 * [ scriptName, scriptPath, binPath ]
 *
 */
function entriesFromDependencies(node, nodeBase, callback) {
    readPackageJsons(node, nodeBase, (err, packageJsons) => {
        invariant(!err, 'Should never have error result')
        const entries = packageJsons
            .map(packageJson =>
                findFromDependencies(node, packageJson, nodeBase.path)
            )
            .reduce((result, next) => [...result, ...next], [])
        callback(null, entries)
    })
}

/*
 * Produces:
 * [ scriptName, scriptPath, binPath ]
 */
function findFromDependencies(node, packageJson, basePath) {
    const entries =
        typeof packageJson.bin === 'string'
            ? [[packageJson.name, packageJson.name, packageJson.bin]]
            : Object.keys(packageJson.bin || {}).map(scriptName => [
                  packageJson.name,
                  scriptName,
                  packageJson.bin[scriptName],
              ])

    return entries.map(([pkgName, scriptName, scriptCmd]) => [
        scriptName,
        path.resolve(path.join(basePath, 'node_modules', pkgName, scriptCmd)),
        path.join(node.path, 'node_modules', '.bin'),
    ])
}

function entriesFromLocalPackages(node, callback) {
    const entries = node.reachable
        .map(childNode => findFromLocalPackages(node, childNode))
        .reduce((result, next) => [...result, ...next], [])

    callback(null, entries)
}

/*
 * Produces:
 * [ scriptName, scriptPath, binPath ]
 */
function findFromLocalPackages(nodeDestination, nodeSource) {
    const entries =
        typeof nodeSource.packageJson.bin === 'string'
            ? [[nodeSource.name, nodeSource.packageJson.bin]]
            : Object.keys(nodeSource.packageJson.bin || {}).map(scriptName => [
                  scriptName,
                  nodeSource.packageJson.bin[scriptName],
              ])

    return entries.map(([scriptName, scriptCmd]) => [
        scriptName,
        path.resolve(path.join(nodeSource.path, scriptCmd)),
        path.join(nodeDestination.path, 'node_modules', '.bin'),
    ])
}

function link([scriptName, scriptPath, binPath], callback) {
    const binLinkPath = path.join(binPath, scriptName)
    if (process.platform === 'win32') {
        cmdShim(scriptPath, binLinkPath, callback)
    } else {
        async.series(
            [
                done => fse.ensureDir(binPath, done),
                done => fse.ensureSymlink(scriptPath, binLinkPath, done),
                done => fse.chmod(binLinkPath, '755', done),
            ],
            callback
        )
    }
}

function readPackageJsons(node, baseNode, callback) {
    const moduleNamespace = name => {
        const PRIVATE_MODULE = /^@.+\//
        if (!PRIVATE_MODULE.test(name)) {
            return [name]
        }

        const [prefix] = PRIVATE_MODULE.exec(name)
        const postfix = name.slice(prefix.length)
        return [prefix, postfix]
    }

    const pathsFromBag = (bag = {}) =>
        Object.keys(bag)
            .filter(name => !bag[name].startsWith('file:'))
            .map(moduleNamespace)
            .map(namespace =>
                path.join(
                    ...[
                        baseNode.path,
                        'node_modules',
                        ...namespace,
                        'package.json',
                    ]
                )
            )

    const packageJsonPaths = [
        ...pathsFromBag(node.packageJson.dependencies),
        ...pathsFromBag(node.packageJson.devDependencies),
    ]

    async.map(
        packageJsonPaths,
        (packageJsonPath, done) =>
            fse.readFile(packageJsonPath, 'utf8', (err, data) => {
                if (err) {
                    done(null, null)
                } else {
                    let packageJson
                    try {
                        packageJson = JSON.parse(data)
                    } catch (e) {
                        packageJson = null
                    }
                    done(null, packageJson)
                }
            }),
        // eslint-disable-next-line
        (err, results) => {
            callback(err, results.filter(Boolean))
        }
    )
}