import "./App.css";
import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Modal from "react-bootstrap/Modal";
import Alert from "react-bootstrap/Alert";

import Button from "react-bootstrap/Button";
import Picker from "emoji-picker-react";
import Spinner from "react-bootstrap/Spinner";

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const MMWeb3 = require("web3");

const ALCHEMY_URL = "<insert_alchemy_url_here>"

const web3 = createAlchemyWeb3(ALCHEMY_URL);

const contract = "0xd6CB14db8ba0db0fDba86C489eE4e39CC6AdE323";

const openSeaBase = `https://opensea.io/assets/${contract}/`;

function App() {
  const [account, setAccount] = useState();
  const [ownedTokens, setOwnedTokens] = useState([]);
  const [emoji, setEmoji] = useState("");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [emojiGrid, setEmojiGrid] = useState([]);
  const [emojiPlacement, setEmojiPlacement] = useState([]);
  const [emojiLand, setEmojiLand] = useState({});
  const [show, setShow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [ownedTokenPlacements, setOwnedTokenPlacements] = useState([]);
  const [placementToIdMap, setPlacementToIdMap] = useState({});
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState(null);

  const handleClose = () => {
    setShowPicker(false);
    setEmoji("");
    setShow(false);
  };
  const handleShow = () => setShow(true);

  const refreshData = () => {
    const encodedGrid = web3.eth.abi.encodeFunctionCall(
      {
        inputs: [],
        name: "getEmojiGrid",
        outputs: [
          {
            internalType: "string[]",
            name: "",
            type: "string[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      []
    );
    const encodedPlacement = web3.eth.abi.encodeFunctionCall(
      {
        inputs: [],
        name: "getEmojiPlacement",
        outputs: [
          {
            internalType: "uint256[]",
            name: "",
            type: "uint256[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      []
    );
    web3.eth
      .call({
        to: contract,
        data: encodedGrid,
      })
      .then((res) => {
        setEmojiGrid(web3.eth.abi.decodeParameter("string[]", res));
      });

    web3.eth
      .call({
        to: contract,
        data: encodedPlacement,
      })
      .then((res) => {
        setEmojiPlacement(web3.eth.abi.decodeParameter("uint256[]", res));
      });
  };

  useEffect(refreshData, []);

  useEffect(() => {
    const land = {};
    const tokenIds = {};
    if (emojiGrid.length === emojiPlacement.length) {
      for (let i = 0; i < emojiGrid.length; i++) {
        tokenIds[parseInt(emojiPlacement[i])] = i;
        land[parseInt(emojiPlacement[i])] = emojiGrid[i];
      }
      setEmojiLand(land);
      setPlacementToIdMap(tokenIds);
    }
  }, [emojiGrid, emojiPlacement]);

  useEffect(() => {
    if (account) {
      const encodedTokensOfOwner = web3.eth.abi.encodeFunctionCall(
        {
          inputs: [
            {
              internalType: "address",
              name: "_owner",
              type: "address",
            },
          ],
          name: "tokensOfOwner",
          outputs: [
            {
              internalType: "uint256[]",
              name: "",
              type: "uint256[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        [account]
      );
      web3.eth
        .call({
          to: contract,
          data: encodedTokensOfOwner,
        })
        .then((res) => {
          const _ownedTokens = web3.eth.abi.decodeParameter("uint256[]", res);
          const ownedTokensNums = _ownedTokens.map((token) => parseInt(token));
          setOwnedTokens(ownedTokensNums);
          setOwnedTokenPlacements(
            ownedTokensNums.map((tn) => parseInt(emojiPlacement[tn]))
          );
        });
    }
  }, [account, emojiPlacement]);

  const connectEthWallet = async () => {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    window.web3 = new MMWeb3(window.ethereum);

    setAccount(accounts[0]);
  };
  const mintToken = async () => {
    const encoded = web3.eth.abi.encodeFunctionCall(
      {
        inputs: [
          {
            internalType: "string",
            name: "em",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "x",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "y",
            type: "uint256",
          },
        ],
        name: "mintSpot",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      [emoji, x, y]
    );
    setMintSuccess(false);
    setChangeSuccess(false);
    setError(false);
    await window.web3.eth
      .sendTransaction({
        from: account,
        to: contract, // contract address
        data: encoded,
      })
      .on("transactionHash", (hash) => {
        setConfirmationLoading(true);
        setEmoji("");
      })
      .on("confirmation", function (confirmationNumber, receipt) {
        refreshData();
        handleClose();
        setConfirmationLoading(false);
        setMintSuccess(true);
      })
      .on("error", (err) => {
        refreshData();
        handleClose();
        setConfirmationLoading(false);
        setError(true);
      });
  };

  const isValidEmoji = (emoji) => {
    const pairs = [
      [14847130, 14855573],
      [4036984964, 4036995762],
      [249042553518223, 250184427616399],
      [10115200151880611, 67729485498136719],
      [17338726241471006632, 17338726348845189052],
      [290895720109770093197502138, 290896144096653412365477565],
      [19064140619185476506089144957071, 19064169765631408777539437443215],
    ];
    const test = stringToInt(emoji);
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (test >= pair[0] && test <= pair[1]) {
        return true;
      }
    }
    return false;
  };

  const stringToInt = (c) => {
    let n = 0;
    const b = unescape(encodeURIComponent(c));
    for (let i = 0; i < b.length; i++) {
      n += b.charCodeAt(i) * 2 ** (8 * (b.length - (i + 1)));
    }
    return n;
  };

  const changeToken = async () => {
    const pos = x * 100 + y;
    const tokenId = placementToIdMap[pos];
    const encoded = web3.eth.abi.encodeFunctionCall(
      {
        inputs: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "em",
            type: "string",
          },
        ],
        name: "setEmoji",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      [tokenId, emoji]
    );
    setMintSuccess(false);
    setChangeSuccess(false);
    setError(false);
    await window.web3.eth
      .sendTransaction({
        from: account,
        to: contract, // contract address
        data: encoded,
      })
      .on("transactionHash", (hash) => {
        setConfirmationLoading(true);
        setEmoji("");
      })
      .on("confirmation", function (confirmationNumber, receipt) {
        refreshData();
        handleClose();
        setConfirmationLoading(false);
        setChangeSuccess(true);
      })
      .on("error", (err) => {
        refreshData();
        handleClose();
        setConfirmationLoading(false);
        setError(true);
      });
  };

  const renderModalBody = () => {
    const pos = x * 100 + y;
    if (pos in placementToIdMap) {
      const tokenId = placementToIdMap[pos];
      const owner = ownedTokens.includes(tokenId);

      if (owner) {
        return renderPicker(true, tokenId);
      } else {
        return renderTaken(tokenId);
      }
    }
    return renderPicker(false);
  };

  const spotOnEnter = (x, y) => {
    setHovered(`${y}, ${x}`);
  };

  const renderSpot = (em, x, y) => {
    const pos = x * 100 + y;
    const owned = ownedTokenPlacements.includes(pos);
    return (
      <div
        onClick={() => {
          setX(x);
          setY(y);
          handleShow();
        }}
        onMouseEnter={() => spotOnEnter(x, y)}
        className="emojiSpot"
        style={{
          border: owned ? "1px solid white" : "1px solid #2c2c2c",
          cursor: "pointer",
          fontSize: 24,
          borderRadius: 5,
          padding: 5,
          margin: 1,
        }}
      >
        {em ? em : "❔"}
      </div>
    );
  };

  const renderRows = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 100; i++) {
      const innerArr = [];
      for (let j = 0; j < 100; j++) {
        const pos = i * 100 + j;
        if (emojiLand[pos]) {
          innerArr.push(renderSpot(emojiLand[pos], i, j));
        } else {
          innerArr.push(renderSpot(null, i, j));
        }
      }
      arr.push(<div style={{ display: "flex" }}>{innerArr}</div>);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiLand, ownedTokenPlacements, renderSpot]);

  const renderPicker = (owner, tokenId) => {
    const title = owner ? "Change This Spot" : "Claim this spot";
    const alert = owner ? "You are changing " : "You are claiming ";
    const action = owner ? "Submit" : "Mint";

    return (
      <>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>

        {confirmationLoading && (
          <Modal.Body>
            <Alert style={{ textAlign: "center" }}>
              Your transaction is being confirmed
            </Alert>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Spinner animation="border" role="status"></Spinner>
            </div>
          </Modal.Body>
        )}

        {!confirmationLoading && (
          <>
            <Modal.Body>
              <Alert style={{ textAlign: "center" }}>
                {alert}the position ({y}, {x})
              </Alert>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  onClick={() => setShowPicker(true)}
                  className="emojiButton"
                >
                  {emoji ? emoji : "❔"}
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 80,
                  display: showPicker ? "block" : "none",
                }}
              >
                <Picker
                  onEmojiClick={(_, e) => {
                    if (isValidEmoji(e.emoji)) {
                      setEmoji(e.emoji);
                      setShowPicker(false);
                    } else {
                      window.alert("Invalid emoji :(");
                    }
                  }}
                  disableSkinTonePicker={true}
                />
              </div>
              {!account && (
                <div
                  style={{
                    color: "#ed8181",
                    marginTop: 20,
                    textAlign: "center",
                  }}
                >
                  You must be{" "}
                  <span
                    style={{ textDecoration: "underline", cursor: "pointer" }}
                    onClick={connectEthWallet}
                  >
                    logged in
                  </span>{" "}
                  to mint
                </div>
              )}
              {!emoji && account && (
                <div
                  style={{
                    color: "#ed8181",
                    marginTop: 20,
                    textAlign: "center",
                  }}
                >
                  Pick an emoji
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              {owner && (
                <Button
                  style={{ marginRight: "auto" }}
                  variant="primary"
                  href={`${openSeaBase}${tokenId}`}
                >
                  View on OpenSea
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              {account && (
                <Button
                  variant="primary"
                  disabled={!isValidEmoji(emoji)}
                  onClick={async () => {
                    if (owner) {
                      await changeToken();
                    } else {
                      await mintToken();
                    }
                  }}
                >
                  {action}
                </Button>
              )}
            </Modal.Footer>
          </>
        )}
      </>
    );
  };

  const renderTaken = (tokenId) => {
    return (
      <>
        <Modal.Header closeButton>
          <Modal.Title>Spot already claimed</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert>
            This position ({y}, {x}) has already been claimed. If you're the
            owner,{" "}
            <span
              style={{ textDecoration: "underline", cursor: "pointer" }}
              onClick={connectEthWallet}
            >
              log in
            </span>{" "}
            to your wallet that contains this spot
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button
            style={{ marginRight: "auto" }}
            variant="primary"
            href={`${openSeaBase}${tokenId}`}
          >
            View on OpenSea
          </Button>
        </Modal.Footer>
      </>
    );
  };

  return (
    <div style={{ fontFamily: "monospace" }}>
      {hovered && (
        <div style={{ color: "white", background: "black", position: "fixed" }}>
          {hovered}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 20,
        }}
      >
        <h1 style={{ letterSpacing: 3 }}>
          🏔️ 🌋 🏝️ 🏛️ 🛖 🏡 🏰 🗼 🗽 ⛩️ ⛲ ⛺ 🌈{" "}
        </h1>

        {confirmationLoading && (
          <Alert style={{ textAlign: "center" }}>
            A transaction is currently being finalized
          </Alert>
        )}
        {mintSuccess && (
          <Alert variant={"success"} style={{ textAlign: "center" }}>
            Success - you minted a spot, wagmi! 🥳
          </Alert>
        )}
        {changeSuccess && (
          <Alert variant={"success"} style={{ textAlign: "center" }}>
            Success! You changed a spot 🥳
          </Alert>
        )}
        {error && (
          <Alert variant={"danger"} style={{ textAlign: "center" }}>
            Oh no! Something went wrong 😰
          </Alert>
        )}
        <div
          style={{
            color: "white",
            fontSize: 40,
            fontFamily: "monospace",
          }}
        >
          gm friends. let's play a game
        </div>
        <div style={{ color: "white", fontSize: 14, marginBottom: 20 }}>
          (Contract is unaudited, play at your own risk)
        </div>
        <div
          style={{
            fontFamily: "monospace",
            color: "white",
            fontSize: 20,
          }}
        >
          <p style={{ textAlign: "center" }}>100x100 Grid of Emojis</p>
          <p>
            🔑 &nbsp;If you own the NFT of a spot, you can change the emoji that
            goes there
          </p>
          <p>
            🌱 &nbsp;Mint an NFT of any unclaimed spot to claim it. It's free
            (other than gas)
          </p>
          <p>
            🎨 &nbsp;NFT art will dynamically update when any neighboring emoji
            changes
          </p>
        </div>
        <div style={{ display: "flex" }}>
          <a
            style={{
              color: "#8fdff9",
              fontSize: 16,
              marginBottom: 30,
              marginRight: 20,
            }}
            href="https://discord.com/invite/sSp5TXwp"
          >
            Join the discord
          </a>
          <a
            style={{
              color: "#8fdff9",
              fontSize: 16,
              marginBottom: 30,
              marginLeft: 20,
            }}
            href="https://twitter.com/rishab_hegde"
          >
            Say hi to me on twitter
          </a>
        </div>
        {account && (
          <div style={{ color: "white" }}>Logged in as {account}</div>
        )}
        {!account && (
          <Button variant="primary" onClick={connectEthWallet}>
            Log In Using Metamask
          </Button>
        )}
      </div>

      <div style={{ marginTop: 10 }} onMouseLeave={() => setHovered(null)}>
        {renderRows}
      </div>
      <div />

      <Modal show={show} onHide={handleClose}>
        {renderModalBody()}
      </Modal>
    </div>
  );
}

export default App;
