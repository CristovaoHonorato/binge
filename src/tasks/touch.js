import fse from 'fs-extra'
import path from 'path'

import { apply as deltaApply, pinDownRanges } from '../util/dependencyDelta'

export default function(node, dependencyDelta, callback) {
    if (node.isDummy === true) {
        callback(null)
        return
    }

    const pinnedDependencyDelta = pinDownRanges(dependencyDelta)

    const { packageJson } = deltaApply(node.packageJson, pinnedDependencyDelta)

    if (node.packageJson !== packageJson) {
        const dataPath = path.join(node.path, 'package.json')
        const packageJsonData = `${JSON.stringify(packageJson, null, 2)}\n`
        fse.writeFileSync(dataPath, packageJsonData, 'utf8')
        node.packageJson = packageJson
        node.packageJsonData = packageJsonData
    }

    callback(null)
}