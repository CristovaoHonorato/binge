import sortKeys from './sortKeys'

export function applyIf(packageJson, dependencyDelta = {}) {
    const collect = (bagDependencies = {}, bagDelta = {}) =>
        Object.keys(bagDelta)
            // is in the packageJson
            .filter(name => Boolean(bagDependencies[name]))
            // only write if it changed
            .filter(name => bagDelta[name] !== bagDependencies[name])
            .reduce(
                (result, name) => ({
                    ...result,
                    [name]: bagDelta[name],
                }),
                {}
            )

    const allFromDelta = {
        ...(dependencyDelta.dependencies || {}),
        ...(dependencyDelta.devDependencies || {}),
    }

    const appliedDelta = {
        dependencies: collect(packageJson.dependencies, allFromDelta),
        devDependencies: collect(packageJson.devDependencies, allFromDelta),
    }

    return toResult(packageJson, appliedDelta)
}

export function apply(packageJson, dependencyDelta = {}, force) {
    const collect = (bagDependencies = {}, bagDelta = {}) =>
        Object.keys(bagDelta)
            // only write if it changed
            .filter(name => bagDelta[name] !== bagDependencies[name])
            .reduce(
                (result, name) => ({
                    ...result,
                    [name]: bagDelta[name],
                }),
                {}
            )

    const appliedDelta = {
        dependencies: collect(
            packageJson.dependencies,
            dependencyDelta.dependencies
        ),
        devDependencies: collect(
            packageJson.devDependencies,
            dependencyDelta.devDependencies
        ),
    }

    return toResult(packageJson, appliedDelta)
}

export function extract(packageJson, names) {
    /*
     * If we are adding a dependency, but that exact dependency version is
     * already included in the monorepo, and thus figuring in the
     * yarn.lock, no delta will be produced. In any case, we want to add it
     * to the package.json at entry location.
     */

    const collect = bag =>
        Object.keys(bag)
            .filter(key => names.includes(key))
            .reduce(
                (result, key) => ({
                    ...result,
                    [key]: bag[key],
                }),
                {}
            )

    return {
        dependencies: collect(packageJson.dependencies),
        devDependencies: collect(packageJson.devDependencies),
    }
}

function toResult(packageJson, appliedDelta) {
    return {
        appliedDelta,
        packageJson: isEmpty(appliedDelta)
            ? packageJson
            : {
                  ...packageJson,
                  dependencies: sortKeys({
                      ...(packageJson.dependencies || {}),
                      ...(appliedDelta.dependencies || {}),
                  }),
                  devDependencies: sortKeys({
                      ...(packageJson.devDependencies || {}),
                      ...(appliedDelta.devDependencies || {}),
                  }),
              },
    }
}

export function infer(prevPackageJson, nextPackageJson) {
    const collect = key => {
        const nextNames = Object.keys(nextPackageJson[key] || {})

        return nextNames
            .filter(
                name =>
                    prevPackageJson[key][name] !== nextPackageJson[key][name]
            )
            .reduce(
                (result, name) => ({
                    ...result,
                    [name]: nextPackageJson[key][name],
                }),
                {}
            )
    }

    return {
        dependencies: collect('dependencies'),
        devDependencies: collect('devDependencies'),
    }
}

export const empty = {
    dependencies: {},
    devDependencies: {},
}

export function isEmpty(dependencyDelta) {
    return (
        Object.keys(dependencyDelta.dependencies).length === 0 &&
        Object.keys(dependencyDelta.devDependencies).length === 0
    )
}
