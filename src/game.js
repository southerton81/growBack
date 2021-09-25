const beeAnim = [
  new Image(),
  new Image(),
  new Image()
]
beeAnim[0].src = "./assets/bee1.png"
beeAnim[1].src = "./assets/bee2.png"
beeAnim[2].src = "./assets/bee3.png"

let terrainPixelSize = 70
let startTimestamp = 0
var ctx = canvas.getContext("2d")
let maxCovered = 0

let clamp = function(number, min, max) {
  return Math.round(Math.max(min, Math.min(number, max)));
}

let pollenPool = Pool({
  create: Sprite
})

let seedPool = Pool({
  create: Sprite
})

let quadtree = Quadtree()

let bee = Sprite({
  x: canvas.width / 2,
  y: canvas.height / 2 - 120,
  width: 34,
  height: 28,
  dx: 3,
  dy: 0,
  timestamp: 0,
  frame: 0,
  maxFrame: 2,

  update: function (dt) {
    bee.advance(dt)

    if (this.x < 0 ||
      this.x + this.width > this.context.canvas.width) {
      this.dx = -this.dx
      this.ddx = 0
    }
    if (this.y < 0 ||
      this.y + this.height > this.context.canvas.height) {
      this.dy = -this.dy
      this.ddy = 0
    }

    let period = Date.now() - this.timestamp
    if (period > 50) {
      this.frame++
      if (this.frame > this.maxFrame) this.frame = 0
      this.timestamp = Date.now()
    }
  },

  render: function () {
    this.context.save()
    let x = this.x
    if (this.dx < 0) {
      this.context.scale(-1, 1)
      this.flipped = true
      x = -x - this.width
    }
    this.context.drawImage(beeAnim[this.frame], x, this.y, this.width, this.height)
    this.context.restore()
  }
})

let terrain = Sprite({
  x: 0,
  y: 0,
  width: canvasWidth,
  height: canvasHeight, 
  grassGrowTimestamp: Date.now(), 
  sandGrowTimestamp: Date.now(), 
  terrainColor: null,
  flowers: [],
  maxAge: 10,
 
  init: function() {
    this.grassGrowTimestamp = Date.now()
    this.sandGrowTimestamp = Date.now()
    this.terrainColor = initTerrain(canvasWidth / terrainPixelSize, canvasHeight / terrainPixelSize)
    this.flowers = initFlowers(canvasWidth, canvasHeight, 5)
    this.flowers.forEach(it => {
      this.modTerrain(it[0], it[1], 1)
    }) 
  },

  renderFlowers: function (flowers) { 
    
    flowers.forEach(f => {
      let age = f[2]
      let width = f[3]
      let height = f[4] 
      let horFlower = f[5]
      let verFlower = f[6]
      let leafs = f[7]
      let stemColor = f[8][0]
      let polColor = f[8][1]
      let flowerColor = f[8][2]
      let hasPollen = f[10]
      let pollenSize = age < 5 ? 2 : 4
      let defaultFlowerDimH = 6
      let defaultFlowerDimV = 10

      if (age > this.maxAge) {
        age = this.maxAge - (age - this.maxAge)
      }

      let heightChangeRatio = height / (this.maxAge - 3)
      height = Math.min(height, age * heightChangeRatio)
      let center = [f[0] - width, f[1] - height]
      this.context.fillStyle = stemColor
      this.context.fillRect(center[0], center[1], width, height)


      leafs.forEach(l => {
        let base = l[0]
        let side = l[1]
        let form = l[2]
        if (height > base) {
          let startX = f[0] - width
          let startY = f[1] - base
          
          let currX = startX 
          let currY = startY

          form.forEach(frm => {
            if (frm == 0) {
              currX+=side
              currY-=1
            } else if (frm == 1) {
              currY-=1
            } else {
              currX+=side
            }
          })
          this.context.fillRect(currX, currY, 2, 2)
        }
      })


      if (age > 4) {
        this.context.fillStyle = polColor
        let pX = center[0] - pollenSize
        let pY = center[1] - pollenSize
        let w = pollenSize * 2 + 1
        let h = pollenSize * 2 
      
        pollenPool.get({
          x: pX,
          y: pY,
          width: w,
          height: h,
          color: hasPollen ? 'orange' : 'white',
          flower: f,
          ttl: 1
        })
      }

      if (age > 4) {
        defaultFlowerDimV = defaultFlowerDimV / Math.max(1, (this.maxAge - age))
        defaultFlowerDimH = defaultFlowerDimH / Math.max(1, (this.maxAge - age))
        horFlower = horFlower / Math.max(1, (this.maxAge - age))
        verFlower = verFlower / Math.max(1, (this.maxAge - age))

        this.context.fillStyle = flowerColor
        this.context.fillRect(center[0] - pollenSize - defaultFlowerDimV, center[1] - verFlower,
          defaultFlowerDimV, verFlower * 2)
        this.context.fillRect(center[0] + pollenSize, center[1] - verFlower,
          defaultFlowerDimV, verFlower * 2)
        this.context.fillRect(center[0] - horFlower / 2, center[1] - pollenSize - defaultFlowerDimH,
          horFlower, defaultFlowerDimH)
        this.context.fillRect(center[0] - horFlower / 2, center[1] + pollenSize,
          horFlower, defaultFlowerDimH)
      }
    })

    pollenPool.render()
    seedPool.render()
  },

  updateTerrain: function () {
    let period = Date.now() - this.grassGrowTimestamp
    if (period > 2500) {
      this.flowers.forEach(f => {
        let tx = clamp(Math.floor(f[0] / terrainPixelSize), 0, this.terrainColor.length - 1)
        let ty = clamp(Math.floor(f[1] / terrainPixelSize), 0, this.terrainColor[0].length - 1)

        if (this.terrainColor[tx][ty][1] == 0) {
          let cnt = this.terrainColor[tx][ty][2]
          this.terrainColor[tx][ty] = [initGrassColor(), 1, cnt]
        }

        tx = Math.min(Math.max(0, tx + (-1 + Math.round(2 * Math.random()))), this.terrainColor.length - 1)
        ty = Math.min(Math.max(0, ty + (-1 + Math.round(2 * Math.random()))), this.terrainColor[0].length - 1)
        if (this.terrainColor[tx][ty][1] == 0) {
          let cnt = this.terrainColor[tx][ty][2]
          this.terrainColor[tx][ty] = [initGrassColor(), 1, cnt]
        }
      })

      this.grassGrowTimestamp = Date.now()
    }

    period = Date.now() - this.sandGrowTimestamp
    if (period > 2500) {
      for (let y = 0; y < this.terrainColor[0].length; y++) {
        for (let x = 0; x < this.terrainColor.length; x++) {
          let cell = this.terrainColor[x][y]
          if (cell[1] == 1 && cell[2] <= 0) {
            cell[0] = initSandColor()
            cell[1] = 0
            break
          }   
        }
      }

      this.sandGrowTimestamp = Date.now()
    }
  },

  modTerrain: function (x, y, value) {
    let fromX = clamp((x / terrainPixelSize) - 2, 0, this.terrainColor.length - 1)
    let toX = clamp((x / terrainPixelSize) + 2, 0, this.terrainColor.length - 1)
    let fromY = clamp((y / terrainPixelSize) - 2, 0, this.terrainColor[0].length - 1)
    let toY = clamp((y / terrainPixelSize) + 2, 0, this.terrainColor[0].length - 1)

    for (h = fromX; h <= toX; h++) {
      for (v = fromY; v <= toY; v++) {
        this.terrainColor[h][v][2] += value
      }
    }
  },

  render: function () { 
    let grassCnt = 0
    for (x = 0; x < canvasWidth; x += terrainPixelSize) {
      for (y = 0; y < canvasHeight; y += terrainPixelSize) {
        let cell = this.terrainColor[x / terrainPixelSize][y / terrainPixelSize]
        this.context.fillStyle = cell[0]
        this.context.fillRect(x, y, x + terrainPixelSize, y + terrainPixelSize)
        grassCnt += cell[1] 
      }
    }

    this.renderFlowers(this.flowers) 
    let totalCnt = Math.floor((canvasWidth / terrainPixelSize) * (canvasHeight / terrainPixelSize))
   
    let covered = grassCnt / totalCnt 
    if (maxCovered < covered)
      maxCovered = covered   
    return covered
  },

  update: function (dt) {
    let len = this.flowers.length
    let pollenSprites = pollenPool.getAliveObjects() 
    quadtree.clear()
    quadtree.add(pollenSprites)
    quadtree.add(bee)
    let candidates = quadtree.get(bee)

    candidates.some(c => {
      if (bee.collidesWith(c) && bee.lastFlower !== c.flower) {

        if (bee.hasPollen) {

          // Spend pollen
          let seedCount = 1 + Math.round(Math.random() * 10) 
          let flowerHeight = c.flower[4] 

          let startX = c.flower[0]
          let startY = c.flower[1] - flowerHeight

          let terrain = this
          for (s = 0; s < seedCount; s++) {
            seedPool.get({ 
              x: startX,
              y: startY,
              width: 5,
              height: 10,
              color: 'black',
              ddx: (50 + Math.random() * 100) * (Math.random() > .5 ? -1 : 1),
              ddy: (50 + Math.random() * 100) * (Math.random() > .5 ? -1 : 1),
              launchedTs: Date.now(),
              maxSpanSec: 1 + Math.random() * 2,
              
              update: function (dt) {
                this.advance(dt)
                let timespanSec = (Date.now() - this.launchedTs) / 1000
                if (timespanSec > this.maxSpanSec) {
                  this.ttl = 0

                  if (Math.random() > .5) {
                    terrain.flowers.push(createFlower(this.x, this.y))
                    terrain.modTerrain(this.x, this.y, 1)
                  }
                }

                if (dt > 0) {
                  this.ddx *= 1 - dt * 2
                  this.ddy *= 1 - dt * 2
                }
              }
            
            })
          }
        }

        bee.lastFlower = c.flower
        bee.hasPollen = c.flower[10] /*does bee have new pollen now*/
        c.flower[10] = false /*flower doesn't have pollen now*/
        return true;
      }
      return false;
    })

    pollenPool.update(dt)
    seedPool.update(dt)
    this.updateTerrain()

    while (len--) {
      let f = this.flowers[len]
      let creationTimestamp = f[9]
      let timeSpanSec = (Date.now() - creationTimestamp) / 1000
      f[2] = timeSpanSec / agePerSec
      if (f[2] > f[11]/*max age*/) {
        if (Math.random() > .95) {
          this.flowers.splice(len, 1)
          this.modTerrain(f[0], f[1], -1)
        }
      }
    }
  }
})


let statsText = null
terrain.init()

let loop = GameLoop({ 
  gameStartedFlag: false,
  gameOverFlag: false,

  update: function(dt) { 
    if (this.gameStartedFlag) {
      terrain.update(dt)
      bee.update(dt)
      updateController() 
      checkGameOver()
    }
  },

  render: function() { 
    let covered = terrain.render() 
    bee.render()

    if (!this.gameStartedFlag) {
      ctx.font = "170px ma"
      ctx.fillStyle =  "white"
      ctx.textAlign = "center"
      ctx.fillText("GROW BACK", canvas.width/2, canvas.height/2 - 200)
      ctx.font = "50px ma" 
      ctx.fillText("Turn a desert into greenfield", canvas.width/2, canvas.height/2)
      ctx.fillText("Collect pollen from flowers to spread the life back", canvas.width/2, canvas.height/2 + 50)
      ctx.fillText("Use arrow keys to fly", canvas.width/2, canvas.height/2 + 100)
      ctx.fillText("Press any key to start...", canvas.width/2, canvas.height/2 + 200)
    } else if (covered == 1) {
      ctx.font = "170px ma"
      ctx.fillStyle =  "white"
      ctx.textAlign = "center"
      ctx.fillText("You have won!", canvas.width/2, canvas.height/2)
      ctx.font = "80px ma"
      if (statsText === null) {
        let timeSec = (Date.now() - startTimestamp) / 1000
        let timeMin = Math.floor(timeSec / 60)
        timeSec = Math.floor(timeSec % 60)
        statsText = "time: " + timeMin + " min " + timeSec + " s"
      }
      ctx.fillText(statsText, canvas.width/2, canvas.height/2 + 150)
      ctx.fillText("press R to restart", canvas.width/2, canvas.height/2 + 250)
      listenForRetry()
    } else if (this.gameOverFlag) {
      ctx.font = "170px ma"
      ctx.fillStyle =  "white"
      ctx.textAlign = "center"
      ctx.fillText("Game over", canvas.width/2, canvas.height/2)
      ctx.font = "80px ma"
      ctx.fillText("Best planted" + Math.floor(maxCovered * 100) + " percent", canvas.width/2, canvas.height/2 + 200)
      ctx.fillText("Press R to try again", canvas.width/2, canvas.height/2 + 260)
      listenForRetry()
    }
  }
})

function listenForRetry() {
  document.onkeydown = function(e) {
    if (e.code == 'KeyR') {
      covered = 0
      maxCovered = 0
      statsText = null
      terrain.init()
      loop.gameStartedFlag = true
      loop.gameOverFlag = false
      startTimestamp = Date.now()
      document.onkeydown=function(e){}
    }
  }
}

document.onkeydown = function(e) {
  terrain.init()
  loop.gameStartedFlag = true
  startTimestamp = Date.now()
  document.onkeydown=function(e){}
}

function updateController() {
  const magnitude = Math.sqrt(bee.dx * bee.dx + bee.dy * bee.dy);
  if (magnitude > 200) {
    bee.dx *= 0.95;
    bee.dy *= 0.95;
  }

  bee.ddx = 0
  bee.ddy = 0
  if (keyPressed('left')) {
    if (bee.dx > 0) bee.dx = 0 
    bee.ddx = -200
  } else if (keyPressed('right')) {
    if (bee.dx < 0) bee.dx = 0 
    bee.ddx = 200
  } else if (keyPressed('up')) {
    if (bee.dy > 0) bee.dy = 0 
    bee.ddy = -200
  } else if (keyPressed('down')) {
    if (bee.dy < 0) bee.dy = 0 
    bee.ddy = 200
  }
}

function checkGameOver() {
  if (terrain.flowers.length == 0) {
    loop.gameOverFlag = true
  }
}

initKeys()
initSize()
loop.start()