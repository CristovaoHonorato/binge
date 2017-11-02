import onExit from 'signal-exit'
import createNextState from './nextState'
import { createPreEffects, createPostEffects } from './sideEffects'
import { childLauncher, watchProject } from './fs'

export default rootNode => {
    let state

    const dispatchers = {
        add: changePath =>
            nextTick(() => {
                state = dispatch(state, { type: 'ADD', changePath })
            }),
        change: changePath =>
            nextTick(() => {
                state = dispatch(state, { type: 'CHANGE', changePath })
            }),
        packageReady: () =>
            nextTick(() => {
                state = dispatch(state, { type: 'PACKAGE_READY' })
            }),
        packList: (node, files) =>
            nextTick(() => {
                state = dispatch(state, { type: 'PACKLIST', node, files })
            }),
    }

    const dispatch = (state, action) => {
        const _prevState = state
        preEffects(_prevState, action)
        const _nextState = nextState(_prevState, action)
        postEffects(_prevState, _nextState, action)
        return _nextState
    }

    const preEffects = createPreEffects(rootNode, dispatchers)
    const nextState = createNextState(rootNode, dispatchers)
    const postEffects = createPostEffects(rootNode, dispatchers)

    console.log('[Binge] Watch indexing... ')
    watchProject(rootNode, watcher => {
        // Initial State
        state = {
            mode: 'watching',
            spawnedApp: null,
            spawnedPackages: [],
            nodes: [rootNode, ...rootNode.reachable],
            packlists: [rootNode, ...rootNode.reachable].map(node => ({
                node,
                files: [],
            })),
        }

        watcher
            .on('change', changePath => {
                dispatchers.change(changePath)
            })
            .on('add', changePath => {
                dispatchers.add(changePath)
            })

        console.log(`[Binge] Watch started!`)
        if (rootNode.isApp) {
            childLauncher.watchApp(rootNode)
        }

        onExit(() => {
            console.log('\n[Binge] Exit detected')
            watcher.close()
            childLauncher.killAll()
        })
    })
}

function nextTick(fn) {
    setTimeout(fn, 0)
}