# emojiland

### React

The `react` folder contains the frontend code that you see on the site https://emojiland.xyz

To run it, `yarn install` then `yarn start`. You must replace `ALCHEMY_URL` in `src/App.js` with your Alchemy URL.

### Flask

The `flask` folder contains the server code that primarily acts to update the NFT artwork that appear on marketplaces like Opensea. 

To run it, `pip install -r requirements.txt` and then `flask run`. You must replace `ALCHEMY_URL` in `main.py` with your Alchemy URL and `REDIS_URL` in `main.py` with a URL to a Redis server.

### Solidity

The `solidity` folder contains the smart contract for Emojiland. Getting you setup to run it is out of scope for this Readme, I suggest looking into [hardhat](https://hardhat.org/) and [buildspace](https://buildspace.so/)

