import { expect } from 'chai'
import reconcileVersion from '../../src/util/reconcileVersion'

describe('util', () => {
    describe('reconcileVersion', () => {
        it('More than one version go to unreconciled', () => {
            expect(reconcileVersion(['1.1.1', '1.2.3'])).to.equal(null)
        })

        it('More than one version, plus mix, go to unreconciled', () => {
            expect(reconcileVersion(['1.1.1', '3.x.x', '1.2.3'])).to.equal(null)
        })

        it('More than one version, plus mix, to reconciled', () => {
            expect(reconcileVersion(['1.1.1', '1.x.x', '1.1.1'])).to.equal(
                '1.1.1'
            )
        })

        it('Version plus x range', () => {
            expect(reconcileVersion(['3.1.1', '3.x.x'])).to.equal('3.1.1')
        })

        it('Version plus x range incompatible', () => {
            expect(reconcileVersion(['3.1.1', '2.x.x'])).to.equal(null)
        })

        it('Range range goes to the higher', () => {
            expect(reconcileVersion(['^3.1.1', '~3.5.3'])).to.equal('3.5.3')
        })

        it('Single range', () => {
            expect(reconcileVersion('^3.1.1')).to.equal('3.1.1')
        })

        it('Single version', () => {
            expect(reconcileVersion('2.3.4')).to.equal('2.3.4')
        })
    })
})
