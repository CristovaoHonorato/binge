import chalk from 'chalk'
import chokidar from 'chokidar'
import fse from 'fs-extra'
import invariant from 'invariant'
import npmPacklist from 'npm-packlist'
import path from 'path'

import * as log from '../../log'

import { scriptWatch } from '../../util/node'

import { yarn as spawnYarn } from '../../util/spawnTool'

export function watchProject(rootNode, callback) {
    function longestCommonPrefix(paths) {
        const A = paths.sort()
        let a1 = A[0]
        let a2 = A[A.length - 1]
        const L = a1.length
        let i = 0
        while (i < L && a1.charAt(i) === a2.charAt(i)) i++
        return a1.substring(0, i)
    }

    const rootPath = longestCommonPrefix([
        rootNode.path,
        ...rootNode.reachable.map(childNode => childNode.path),
    ])
    const watcher = chokidar
        .watch(rootPath, {
            ignored: /node_modules|\.gradle/,
        })
        .on('ready', () => callback(watcher))
}

export const childLauncher = (() => {
    let state = {
        app: null,
        packages: {},
    }

    return {
        watchApp,
        watchPackage,
        killAll,
        killPackage,
    }

    function watchApp(appNode) {
        invariant(appNode.isApp === true, 'Expected an app node')
        const options = {
            cwd: appNode.path,
            stdio: 'inherit',
        }

        const scriptName = appNode.scriptWatch
        state = {
            ...state,
            app: {
                [appNode.name]: spawnYarn(
                    ['run', scriptName],
                    options,
                    () => {}
                ),
            },
        }
    }

    function watchPackage(packageNode, callback) {
        invariant(packageNode.isApp === false, 'Expected an app node')

        const options = {
            cwd: packageNode.path,
            stdio: ['ignore', 'pipe', 'inherit'],
        }

        const child = spawnYarn(
            ['run', scriptWatch(packageNode)],
            options,
            () => {}
        )
        state = {
            ...state,
            packages: {
                ...state.packages,
                [packageNode.name]: child,
            },
        }

        let timeoutId
        const wait = (ms = 2000) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                child.stdout.removeListener('data', wait)
                callback(null)
            }, ms)
        }

        child.stdout.on('data', wait)
        wait(5000)
    }
    function kill(bag) {
        Object.keys(bag || {}).forEach(name => {
            log.info(`stopped  ${chalk.yellow(name)}`)
            if (bag[name].stdin) {
                bag[name].stdin.pause()
            }
            if (bag[name].stdout) {
                bag[name].stdout.pause()
            }

            if (bag[name].stderr) {
                bag[name].stderr.pause()
            }
            bag[name].kill()
            return name
        })
    }

    function killAll() {
        kill(state.app)
        kill(state.packages)
        state = {
            app: null,
            packages: [],
        }
    }

    function killPackage(name) {
        state.packages[name].kill()
        state = {
            ...state,
            packages: {
                ...state.packages,
                [name]: null,
            },
        }
    }
})()

export function copyFile(appNode, packageNode, changePath) {
    const srcNode = packageNode
    const srcDirPath = packageNode.path
    const srcFilePath = changePath
    const destNode = appNode

    invariant(
        srcFilePath.startsWith(srcDirPath),
        'Resource expected to be a child of srcNode'
    )

    const internalFilePath = changePath.substring(
        srcDirPath.length,
        srcFilePath.length
    )
    invariant(
        path.isAbsolute(srcFilePath),
        'srcFilePath expected to be absolute'
    )

    const destFilePath = path.join(
        destNode.path,
        'node_modules',
        srcNode.name,
        internalFilePath
    )

    invariant(
        path.isAbsolute(destFilePath),
        'destFilePath expected to be absolute'
    )

    logCopy(srcFilePath, destFilePath)
    fse.copySync(srcFilePath, destFilePath)
}

export function packlist(node, callback) {
    npmPacklist({ path: node.path })
        .then(files => {
            const absoluteFilePaths = files.map(filePath =>
                path.join(node.path, filePath)
            )
            callback(null, absoluteFilePaths)
        })
        .catch(err => {
            log.error(
                'There was a problem getting the packlist of node' +
                    node.name +
                    '\n' +
                    err
            )
            process.exit(1)
        })
}

function logCopy(srcPath, destPath) {
    const cwd = process.cwd()
    srcPath = path.relative(cwd, srcPath)
    destPath = path.relative(cwd, destPath)

    log.info(`${chalk.yellow(destPath)} <- ${chalk.magenta(srcPath)}`, 'copy')
}
