import chokidar from 'chokidar'
import fse from 'fs-extra'
import invariant from 'invariant'
import path from 'path'

export default function createTask(destNode, options){

    return (srcNode, callback) => {
        console.log(`Binge: Watching ${srcNode.name}`)

        const srcDirPath = srcNode.path
        invariant(
            path.isAbsolute(srcDirPath),
            'Expected absolute path for the source destNode'
        )

        chokidar
            .watch(srcDirPath, {ignored: srcNode.npmIgnore})
            .on('change', copyFile)

        function copyFile(srcFilePath){
            invariant(
                srcFilePath.startsWith(srcDirPath),
                'Resource expected to be a child of srcNode'
            )

            const internalFilePath = srcFilePath.substring(
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

            console.log(`${srcFilePath} -> ${destFilePath}`)
            fse.copy(srcFilePath, destFilePath, {clobber:true})
        }
    }
}
