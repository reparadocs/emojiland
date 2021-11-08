from flask import Flask
import requests
import cloudinary
import base64
import cloudinary.uploader
import redis 
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from flask import jsonify
import json
from web3 import Web3

REDIS_URL = "<insert_redis_url_here>"
ALCHEMY_URL = "<insert_alchemy_url_here">
CONTRACT_ADDRESS = "0xd6CB14db8ba0db0fDba86C489eE4e39CC6AdE323"

app = Flask(__name__)
baseSVG = "<svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMinYMin meet' viewBox='0 0 350 350'><style>.base {{ fill: white; font-family: serif; font-size: 50px; }}</style><rect width='100%' height='100%' fill='black'/><circle cx='175px' cy='175px' r='35px' fill='grey' /><text class='base' xml:space='preserve'><tspan x='50px' y='117px'>{}</tspan><tspan x='150px'>{}</tspan><tspan x='250px'>{}</tspan><tspan x='50px' y='192px'>{}</tspan><tspan x='150px'>{}</tspan><tspan x='250px'>{}</tspan><tspan x='50px' y='267px'>{}</tspan><tspan x='150px'>{}</tspan><tspan x='250px'>{}</tspan></text></svg>"

r = redis.Redis.from_url(REDIS_URL)

def refreshOpenSea(tokenId):
    return requests.get('https://api.opensea.io/api/v1/asset/' + CONTRACT_ADDRESS + '/' + str(tokenId) + '/?force_update=true')

def generateFullGrid(emojiGrid, emojiPlacements):
    grid = []
    mapper = {}
    for i in range(len(emojiGrid)):
        mapper[XYToIndex(emojiPlacements[i][0], emojiPlacements[i][1])] = emojiGrid[i]
    for i in range(10000):
        if i in mapper:
            grid.append(mapper[i])
        else:
            grid.append("❔")
    return grid 

def XYToIndex(x,y):
    return y * 100 + x

def indexToXY(index):
    return (index % 100, int(index / 100))

def generateSVG(showEmojis):
    return baseSVG.format(*showEmojis)

def getEmojisToShow(grid, x, y):
    positions = [(x-1,  y-1), (x, y-1), (x+1, y-1), (x-1, y), (x,y), (x+1, y), (x-1, y+1), (x, y+1), (x+1, y+1)]
    showEmojis = []
    for p in positions: 
        if p[0] > 99 or p[0] < 0 or p[1] > 99 or p[1] < 0:
            showEmojis.append(' ')
        else:
            showEmojis.append(grid[XYToIndex(p[0], p[1])])
    return showEmojis

def updateEmojiGrid():
    response = requests.post(ALCHEMY_URL, json={"jsonrpc":"2.0","method":"eth_call","params":[{"to": CONTRACT_ADDRESS,"data": "0xfd20d2500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}, "latest"],"id":1}, headers={"Content-Type": "application/json"})
    result = response.json()['result'][66:]
    arrLength = int(result[:64], 16)
    pArr = result[(64*(arrLength+1)):]
    finalArr = []
    for i in range(arrLength):
        offset = (128*i) + 64
        encodedString = pArr[offset:offset+64]
        decodedString = bytes.fromhex(encodedString).decode('utf-8')[:1]
        finalArr.append(decodedString)

    response = requests.post(ALCHEMY_URL, json={"jsonrpc":"2.0","method":"eth_call","params":[{"to": CONTRACT_ADDRESS,"data": "0xedb069bf0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}, "latest"],"id":1}, headers={"Content-Type": "application/json"})
    result = response.json()['result'][66:]
    arrLength = int(result[:64], 16)
    pArr = result[64:]
    placements = []
    for i in range(arrLength):
        offset = 64*i
        encoded = pArr[offset:offset+64]
        decoded = int(encoded, 16)
        x = decoded % 100
        y = int(decoded / 100)
        placements.append((x, y))
    
    fg = generateFullGrid(finalArr, placements)

    for i in range(100):
        for j in range(100):
            key = str(i) + "_" + str(j)
            showEmojis = getEmojisToShow(fg, i, j)
            seString = "".join(showEmojis).encode("utf-8")
            if r.get("c_" + key) != seString:
                r.set("c_" + key, seString)
                svg = generateSVG(showEmojis)
                r.set(key, svg)
                if (i,j) in placements:
                    tokenId = placements.index((i, j))
                    r.sadd("openseaUpdate", tokenId)      

def updateOneOpenSea():
    if r.scard('openseaUpdate') > 0:
        tokenId = r.spop("openseaUpdate")
        req = refreshOpenSea(tokenId.decode('utf-8'))
        print(tokenId)
        print(req.text)
        if 'throttle' in req.text:
            r.sadd("openseaUpdate", tokenId)


scheduler = BackgroundScheduler()
scheduler.add_job(func=updateEmojiGrid, trigger="interval", seconds=300)
scheduler.add_job(func=updateOneOpenSea, trigger="interval", seconds=1)
scheduler.start()

# Shut down the scheduler when exiting the app
atexit.register(lambda: scheduler.shutdown())

@app.route("/")
def hello_world():
    emojiGrid = r.get('emojiGrid').decode('utf-8')
    return "<p>" + emojiGrid + "</p>"

@app.route('/emojiland_static/<svgFile>.svg')
def serve_content(svgFile):
    return r.get(svgFile)

@app.route('/emojiland_metadata/<xPos>_<yPos>.json')
def get_metadata(xPos, yPos):
    x = int(xPos)
    y = int(yPos)
    return jsonify({
    "name": "Emojiland (" + xPos + ", " + yPos + ")",
    "description": "An emoji",
    "image": "https://api.injectmagic.com/emojiland_static/" + xPos + "_" + yPos + ".svg"
})
