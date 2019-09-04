const beeAnim = [
  new Image(),
  new Image(),
  new Image()
]
beeAnim[0].src = "./bee1.png"
beeAnim[1].src = "./bee2.png"
beeAnim[2].src = "./bee3.png"

let terrainPixelSize = 40

let pollenPool = Pool({
  create: Sprite
})

let seedPool = Pool({
  create: Sprite
})

let quadtree = Quadtree()

let bee = Sprite({
  x: 100,
  y: 100,
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
  timestamp: 0, 
  terrainColor: initTerrain(canvasWidth / terrainPixelSize, canvasHeight / terrainPixelSize),
  flowers: initFlowers(canvasWidth, canvasHeight, 5),
  maxAge: 10,
 
  renderFlowers: function (flowers) { 
    
    flowers.forEach(f => {
      let age = f[2]
      let width = f[3]
      let height = f[4] 
      let horFlower = f[5]
      let verFlower = f[6]
      let stemColor = f[8][0]
      let polColor = f[8][1]
      let flowerColor = f[8][2]
      let hasPollen = f[10]
      let pollenSize = age < 8 ? 2 : 4
      let defaultFlowerDimH = 6
      let defaultFlowerDimV = 10

      if (age > this.maxAge) {
        age = this.maxAge - (age - this.maxAge)
      }

      let heightChangeRatio = height / this.maxAge
      height = Math.min(height, age * heightChangeRatio)
      let center = [f[0] - width, f[1] - height]
      this.context.fillStyle = stemColor
      this.context.fillRect(center[0], center[1], width, height)

      if (age > 7) {
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
          color: hasPollen ? 'black' : 'gray',
          flower: f,
          ttl: 1
        })
      }

      if (age > 5) {
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

        let tx = Math.min(this.terrainColor.length, Math.floor(f[0] / terrainPixelSize))
        let ty = Math.min(this.terrainColor[0].length, Math.floor(f[1] / terrainPixelSize))
        if (this.terrainColor[tx][ty][1] == 0) {
          this.terrainColor[tx][ty] = ["hsl(" + 126 + ", 100%, " + 55 + "%)", 1]
        }

        tx = Math.min( Math.max(0, tx + (-1 + Math.round(2 * Math.random()))), this.terrainColor.length )
        ty = Math.min ( Math.max(0, ty + (-1 + Math.round(2 * Math.random()))), this.terrainColor[0].length )
        if (this.terrainColor[tx][ty][1] == 0) {
          this.terrainColor[tx][ty] = ["hsl(" + 126 + ", 100%, " + 55 + "%)", 1]
        }
      }
    })

    pollenPool.render()
    seedPool.render()
  },

  render: function () { 
    for (x = 0; x < canvasWidth; x += terrainPixelSize) {
      for (y = 0; y < canvasHeight; y += terrainPixelSize) {
        this.context.fillStyle = this.terrainColor[x / terrainPixelSize][y / terrainPixelSize][0]
        this.context.fillRect(x, y, x + terrainPixelSize, y + terrainPixelSize)
      }
    }

    this.renderFlowers(this.flowers)
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

    while (len--) {
      let f = this.flowers[len]
      let creationTimestamp = f[9]
      let timeSpanSec = (Date.now() - creationTimestamp) / 1000
      f[2] = timeSpanSec / agePerSec
      if (f[2] > 20) {
        this.flowers.splice(len, 1)
      }
    }
  }
})

let loop = GameLoop({ 
  update: function(dt) { 
    terrain.update(dt)
    bee.update(dt)

    updateController() 
  },

  render: function() { 
    terrain.render()
    bee.render()
  }
})

function updateController() {
  const magnitude = Math.sqrt(bee.dx * bee.dx + bee.dy * bee.dy);
  if (magnitude > 200) {
    bee.dx *= 0.95;
    bee.dy *= 0.95;
  }

  bee.ddx = 0
  bee.ddy = 0
  if (keyPressed('left')) {
    bee.ddx = -200
  } else if (keyPressed('right')) {
    bee.ddx = 200
  } else if (keyPressed('up')) {
    bee.ddy = -200
  } else if (keyPressed('down')) {
    bee.ddy = 200
  }
}

initKeys()
initSize()
loop.start()
 