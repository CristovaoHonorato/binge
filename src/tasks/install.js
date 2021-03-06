import async from 'async'
import fse from 'fs-extra'
import invariant from 'invariant'
import path from 'path'
import createTaskYarn from './yarn'

import {
    hashInstall as integrityHash,
    readInstall as integrityRead,
    writeInstall as integrityWrite,
    cleanInstall as integrityClean,
} from '../integrity'

import { empty as emptyDelta } from '../util/dependencyDelta'

export default (yarnArgs, spawnOptions) => {
    return (node, callback) => {
        invariant(yarnArgs[0] === 'install', 'Should start with install')
        invariant(typeof callback === 'function', 'Expected a function')

        const taskYarn = createTaskYarn(yarnArgs, spawnOptions)

        if (!fse.existsSync(path.join(node.path, 'yarn.lock'))) {
            // eslint-disable-next-line
            callback(`No yarn.lock file found at ${node.path}`)
            return
        }

        async.waterfall(
            [
                // Start by reading the integrity
                done => integrityRead(node, done),
                // hash the current
                ({ md5: prevMD5 }, done) => {
                    if (prevMD5) {
                        integrityHash(node, (err, { md5: nextMD5 }) => {
                            const integrityMatch = Boolean(
                                prevMD5 && nextMD5 && prevMD5 === nextMD5
                            )
                            done(err, integrityMatch)
                        })
                    } else {
                        const integrityMatch = false
                        done(null, integrityMatch)
                    }
                },
                // If there is a mismatch, clean first
                (integrityMatch, done) => {
                    if (!integrityMatch) {
                        integrityClean(node, err => done(err, integrityMatch))
                    } else {
                        done(null, integrityMatch)
                    }
                },
                // If integrities match skip the install. Otherwise install
                (integrityMatch, done) => {
                    if (!integrityMatch) {
                        taskYarn(node, (err, { resultDelta, lockTouch }) =>
                            done(err, {
                                upToDate: false,
                                resultDelta,
                                lockTouch,
                            })
                        )
                    } else {
                        done(null, {
                            upToDate: true,
                            resultDelta: emptyDelta,
                            lockTouch: false,
                        })
                    }
                },
                // Hash the node modules content
                ({ upToDate, ...rest }, done) => {
                    if (!upToDate) {
                        integrityHash(node, (err, { md5, log }) => {
                            done(err, { md5, log, upToDate, ...rest })
                        })
                    } else {
                        done(null, {
                            md5: null,
                            log: null,
                            upToDate,
                            ...rest,
                        })
                    }
                },
                // Write the integrity
                ({ md5, log, ...rest }, done) => {
                    if (md5) {
                        integrityWrite(node, { md5, log }, err =>
                            done(err, rest)
                        )
                    } else {
                        done(null, rest)
                    }
                },
            ],
            callback
        )
    }
}
