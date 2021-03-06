import fse from 'fs-extra'
import invariant from 'invariant'
import onExit from 'signal-exit'
import path from 'path'
import treeKill from 'tree-kill'

import { yarn as spawnYarn } from '../util/spawnTool'
import hoisting from '../hoisting'

import {
    infer as inferDelta,
    empty as emptyDelta,
} from '../util/dependencyDelta'

export default (yarnArgs, spawnOptions) => (node, callback) => {
    invariant(typeof callback === 'function', 'callback is not a function')

    const { dependencies, devDependencies, canHoist } = hoisting(
        node.packageJson,
        node.reachable.map(({ packageJson }) => packageJson)
    )

    if (!canHoist) {
        const error = `cant hoist package '${node.name}', execute 'binge harmony' for details on the problem`
        callback(
            error,

            {
                resultDelta: emptyDelta,
                lockTouch: false,
            }
        )
        return
    }

    const lockDataPrev = readYarnLock(node)
    const packageJsonHoistedPrev = {
        ...node.packageJson,
        ...{
            dependencies,
            devDependencies,
        },
    }

    const errorWrite = writePackageJson(node, packageJsonHoistedPrev)

    if (errorWrite) {
        callback(errorWrite, { resultDelta: emptyDelta, lockTouch: false })
        return
    }

    const unsubscribe = onExit(() => {
        restorePackageJson(node)
        treeKill(child.pid)
    })

    const child = spawnYarn(
        yarnArgs,
        {
            cwd: node.path,
            ...spawnOptions,
        },
        error => {
            unsubscribe()
            const {
                error: errorRestore,
                packageJsonHoisted: packageJsonHoistedNext,
            } = restorePackageJson(node, packageJsonHoistedPrev)

            const lockDataNext =
                !error && !errorRestore ? readYarnLock(node) : null

            const resultDelta =
                !error && !errorRestore
                    ? inferDelta(packageJsonHoistedPrev, packageJsonHoistedNext)
                    : emptyDelta

            callback(error || errorRestore, {
                resultDelta,
                lockTouch:
                    !error && !errorRestore && lockDataPrev !== lockDataNext,
                packageJsonHoistedPrev,
                packageJsonHoistedNext,
            })
        }
    )
}

function writePackageJson(node, packageJsonHoisted) {
    try {
        fse.writeFileSync(
            path.join(node.path, 'package.json'),
            JSON.stringify(packageJsonHoisted),
            'utf8'
        )
        return null
    } catch (e) {
        return e
    }
}

function restorePackageJson(node) {
    const dataPath = path.join(node.path, 'package.json')
    try {
        // read the result
        const packageJsonHoistedNext = JSON.parse(
            fse.readFileSync(path.join(node.path, 'package.json'), 'utf8')
        )

        // restore
        fse.writeFileSync(dataPath, node.packageJsonData, 'utf8')
        return {
            packageJsonHoisted: packageJsonHoistedNext,
            error: null,
        }
    } catch (e) {
        return {
            packageJsonHoisted: null,
            error: e,
        }
    }
}

function readYarnLock(node) {
    const dataPath = path.join(node.path, 'yarn.lock')
    try {
        // read the result
        return fse.readFileSync(dataPath, 'utf8')
    } catch (e) {
        return null
    }
}
