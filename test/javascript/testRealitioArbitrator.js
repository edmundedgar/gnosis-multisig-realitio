const MultiSigWallet = artifacts.require('MultiSigWallet')
const web3 = MultiSigWallet.web3
const TestToken = artifacts.require('TestToken')
const TestCalls = artifacts.require('TestCalls')

const Arbitrator = artifacts.require('Arbitrator')

const deployMultisig = (owners, confirmations) => {
    return MultiSigWallet.new(owners, confirmations)
}
const deployToken = () => {
	return TestToken.new()
}
const deployCalls = () => {
	return TestCalls.new()
}
const deployArbitrator = () => {
	return Arbitrator.new()
}

const utils = require('./utils')

contract('Arbitrator', (accounts) => {
    let multisigInstance
    let tokenInstance
    let callsInstance
    let arbInstance
    const requiredConfirmations = 2

    beforeEach(async () => {
        multisigInstance = await deployMultisig([accounts[0], accounts[1]], requiredConfirmations)
        assert.ok(multisigInstance)
        tokenInstance = await deployToken()
        assert.ok(tokenInstance)
        callsInstance = await deployCalls()
        assert.ok(callsInstance)
        arbInstance = await deployArbitrator()

        const deposit = 10000000
        const arbfunding = 5000000

        // Send money to wallet contract
        await new Promise((resolve, reject) => web3.eth.sendTransaction({to: multisigInstance.address, value: deposit, from: accounts[0]}, e => (e ? reject(e) : resolve())))
        await new Promise((resolve, reject) => web3.eth.sendTransaction({to: arbInstance.address, value: arbfunding, from: accounts[0]}, e => (e ? reject(e) : resolve())))
        const balancemul = await utils.balanceOf(web3, multisigInstance.address)
        const balancearb = await utils.balanceOf(web3, arbInstance.address)
        assert.equal(balancemul.valueOf(), deposit)
        assert.equal(balancearb.valueOf(), arbfunding)
    })

    it('transferOwnership', async() => {

        assert.equal(
            await arbInstance.owner(), 
            accounts[0]
        )

        await arbInstance.transferOwnership(multisigInstance.address, {from: accounts[0]})
        assert.equal(
            await arbInstance.owner(), 
            multisigInstance.address
        )

        // Execution fails, because sender is not wallet owner
        utils.assertThrowsAsynchronously(
            () => arbInstance.transferOwnership(accounts[0], {from: accounts[3]})
        )

        const transferBackTX = arbInstance.contract.transferOwnership.getData(accounts[3])

        const transactionId = utils.getParamFromTxEvent(
            await multisigInstance.submitTransaction(arbInstance.address, 0, transferBackTX, {from: accounts[0]}),
            'transactionId', null, 'Submission')

        const executedTransactionId = utils.getParamFromTxEvent(
            await multisigInstance.confirmTransaction(transactionId, {from: accounts[1]}),
            'transactionId', null, 'Execution')

        assert.equal(
            await arbInstance.owner(), 
            accounts[3]
        )

    })

})
