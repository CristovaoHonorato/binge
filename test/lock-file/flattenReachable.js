import { expect } from 'chai'
import flattenReachable from '../../src/lock-file/flattenReachable'

describe('lock-file', () => {
    describe('flattenReachable', () => {
        it('Reaches the whole tree', () => {
            const packageLock = {
                lockfileVersion: 1,
                dependencies: {
                    acorn: {
                        version: '5.1.1',
                    },
                    'acorn-jsx': {
                        version: '3.0.1',
                        requires: {
                            acorn: '3.3.0',
                        },
                        dependencies: {
                            acorn: {
                                version: '3.3.0',
                            },
                        },
                    },
                    ajv: {
                        version: '5.2.2',
                        requires: {
                            'fast-deep-equal': '1.0.0',
                            'json-stable-stringify': '1.0.1',
                        },
                    },
                    'fast-deep-equal': {
                        version: '1.0.0',
                    },
                    'json-stable-stringify': {
                        version: '1.0.1',
                        requires: {
                            jsonify: '0.0.0',
                        },
                    },
                    jsonify: {
                        version: '0.0.0',
                    },
                },
            }

            const all = [
                {
                    name: 'acorn',
                    version: '5.1.1',
                },
                {
                    name: 'acorn-jsx',
                    version: '3.0.1',
                    requires: {
                        acorn: '3.3.0',
                    },
                    dependencies: {
                        acorn: {
                            version: '3.3.0',
                        },
                    },
                },
                {
                    name: 'ajv',
                    version: '5.2.2',
                    requires: {
                        'fast-deep-equal': '1.0.0',
                        'json-stable-stringify': '1.0.1',
                    },
                },
                {
                    name: 'acorn',
                    version: '3.3.0',
                },
                {
                    name: 'fast-deep-equal',
                    version: '1.0.0',
                },
                {
                    name: 'json-stable-stringify',
                    version: '1.0.1',
                    requires: {
                        jsonify: '0.0.0',
                    },
                },
                {
                    name: 'jsonify',
                    version: '0.0.0',
                },
            ]

            const entryDependencies = {
                'acorn-jsx': '3.0.1',
                acorn: '5.0.x',
            }

            const expected = [
                {
                    name: 'acorn-jsx',
                    version: '3.0.1',
                    requires: {
                        acorn: '3.3.0',
                    },
                    dependencies: {
                        acorn: {
                            version: '3.3.0',
                        },
                    },
                },
                {
                    name: 'acorn',
                    version: '5.1.1',
                },
                {
                    name: 'acorn',
                    version: '3.3.0',
                },
            ]
            expect(
                flattenReachable(packageLock, all, entryDependencies)
            ).to.deep.equal(expected)
        })

        it('Doesnt follow broken links', () => {
            const packageLock = {
                lockfileVersion: 1,
                dependencies: {
                    acorn: {
                        version: '5.1.1',
                        dependencies: {
                            'another-broken-link': null,
                        },
                    },
                    'acorn-jsx': {
                        version: '3.0.1',
                        requires: {
                            acorn: '3.3.0',
                            'another-broken-link': null,
                        },
                        dependencies: {
                            acorn: {
                                version: '3.3.0',
                            },
                            'broken-link': {
                                version: '1.0.0',
                            },
                        },
                    },
                    ajv: {
                        version: '5.2.2',
                        requires: {
                            'fast-deep-equal': '1.0.0',
                            'json-stable-stringify': '1.0.1',
                        },
                    },
                    'fast-deep-equal': {
                        version: '1.0.0',
                    },
                    'json-stable-stringify': {
                        version: '1.0.1',
                        requires: {
                            jsonify: '0.0.0',
                        },
                    },
                    jsonify: {
                        version: '0.0.0',
                    },
                },
            }

            const entryDependencies = {
                acorn: 'doesnt the version for reachable',
                'acorn-jsx': 'doesnt the version for reachable',
                'this-link-is-broken': '---',
            }

            const all = [
                {
                    name: 'acorn',
                    version: '5.1.1',
                    dependencies: {
                        'another-broken-link': null,
                    },
                },
                {
                    name: 'acorn-jsx',
                    version: '3.0.1',
                    requires: {
                        acorn: '3.3.0',
                        'another-broken-link': null,
                    },
                    dependencies: {
                        acorn: {
                            version: '3.3.0',
                        },
                    },
                },
                {
                    name: 'ajv',
                    version: '5.2.2',
                    requires: {
                        'fast-deep-equal': '1.0.0',
                        'json-stable-stringify': '1.0.1',
                    },
                },
                {
                    name: 'acorn',
                    version: '3.3.0',
                },
                {
                    name: 'fast-deep-equal',
                    version: '1.0.0',
                },
                {
                    name: 'json-stable-stringify',
                    version: '1.0.1',
                    requires: {
                        jsonify: '0.0.0',
                    },
                },
                {
                    name: 'jsonify',
                    version: '0.0.0',
                },
            ]

            const expected = [
                {
                    name: 'acorn',
                    version: '5.1.1',
                    dependencies: { 'another-broken-link': null },
                },
                {
                    name: 'acorn-jsx',
                    version: '3.0.1',
                    requires: { acorn: '3.3.0', 'another-broken-link': null },
                    dependencies: {
                        acorn: {
                            version: '3.3.0',
                        },
                        'broken-link': {
                            version: '1.0.0',
                        },
                    },
                },
                { name: 'acorn', version: '3.3.0' },
            ]

            expect(
                flattenReachable(packageLock, all, entryDependencies)
            ).to.deep.equal(expected)
        })
    })
})
