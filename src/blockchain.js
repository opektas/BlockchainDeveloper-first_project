/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
           block.height = self.chain.length; //curent height of block
           block.time = new Date().getTime().toString().slice(0, -3); // current time of block
           if(self.chain.length>0){
            block.previousBlockHash= self.chain[self.chain.length-1].hash; //previous block hash
           }
        block.hash = SHA256(JSON.stringify(block)).toString(); // calculate hash of block
        console.debug('validation of chain starts here');  //Validations starts here
        let.errors = await self.validateChain(); // call the validate method
        console.log(errors)
        console.debug('validation of chain ends here'); 
        if(errors.length == 0){
            self.chain.push(block); // push new block
            self.height++; // increment height
            resolve(block)
        } else {
            reject(errors);
        }
            
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            const OwnershipMessage = '${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry'; //construct the message as explained, with the address + time + starRegistry
            resolve(ownershipMessage);
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let temps = parseInt(message.split(';'),[1]);                               //Get the time from the message sent as a parameter
            let currentTime = parseInt(new Date().getTime().toString().slice(0,-3));    //Get the current time
            if(currentTime - temps < (5*60)){                                           //Check if the time elapsed is less than 5 minutes
                if(bitcoinMessage.verify(message, address, signature)) {                //If yes verify the message
                    let block = new BlockClass.Block({"owner": address, "star": star}); //creation of the new block with the owner and the star 
                    self._addBlock(block);                                              //add the block
                    resolve(block);                                                     //resolve with the new block
                } else {
                    reject(Error('Message is not verified'))  // Error message
                } 
            } else {
                reject(Error('Too much time has passed, stay below 5 minutes')) // Error message
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
           const block = self.chain.filter(block => block.hash === hash);
           if(typeof block != 'undefined'){
            resolve(block);
           } else {
            reject(Error("No block with this hash"))
           }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            self.chain.forEach(async(a) => {        //loops on the blocks
            let data = await a.getBData();          //get decoded data from each block
            if(data){                                 
                if(data.owner == address){          //check if owner of the star is the address passed in param
                    stars.push(data);               //if yes add star's data to the stars array
                }
            }    
            })
            resolve(stars);                         //return array of stars
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            let validatePromises = [];
            self.chain.forEach((block, index) => {
                if(block.height>0) {
                    const previousBlock = self.chain[index-1];
                    if(block.previousBlockHash != previousBlock.hash) {
                        const ErrorMessage = `Block ${index} previousBlockHash set to ${block.previousBlockHash}, but actual previous block hash was ${previousBlock.hash}`;
                        errorLog.push(ErrorMessage);
                    }
                }
                validatePromises.push(blcok.validate()); // store promise to validate each block
            });
            Promise.all(validatePromises).then(validatedBlocks => {
                validatedBlocks.forEach((valid, index) => {
                    if(!valid){
                        const invalidBlock = self.chain[index];
                        const ErrorMessage = 'Block ${index} hash (${invalidBlock.hash}) is valid';
                        errorLog.push(ErrorMessage);
                    }
                });
                resolve(errorLog);
            });

        });
    }

}

module.exports.Blockchain = Blockchain;   