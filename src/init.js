let { init, Sprite, GameLoop, initKeys, keyPressed, Pool, Quadtree } = kontra

let { canvas } = init()

let lastWidth = 0
let lastHeight = 0
let canvasWidth = 800
let canvasHeight = 600

canvas.width = canvasWidth
canvas.height = canvasHeight

d.style.webkitTransformOrigin = d.style.transformOrigin = "0 0"

let agePerSec = 1.5

window.addEventListener("resize", function() {
  initSize()
})

function initSize() {
  let innerWidth = window.innerWidth
  let innerHeight = window.innerHeight
  if (innerWidth != lastWidth || innerHeight != lastHeight) {
    lastWidth = innerWidth
    lastHeight = innerHeight
    var scaleX = canvasWidth / innerWidth
    var scaleY = canvasHeight / innerHeight
    let gameScale = 1 / Math.max(scaleX, scaleY)
    gameScale = Math.min(gameScale, 1)
    d.style.webkitTransform = d.style.transform = "scale(" + gameScale + ")"
    d.style.left = (innerWidth - canvasWidth * gameScale) / 2 + "px"
  }
}

function initTerrain(w, h) {
  let terrain = array2d(w)
  let soilHue = 22
  let soilMinLight = 40
  let soilMaxLight = 55
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let lightness = soilMinLight + Math.random() * (soilMaxLight - soilMinLight)
      terrain[x][y] = ["hsl(" + soilHue + ", 100%, " + lightness + "%)", 0 /*soil type*/, 0 /*cnt of protecting*/ ]
    }
  }
  return terrain
}

function initSandColor() {
  let soilHue = 22
  let soilMinLight = 40
  let soilMaxLight = 55
  let lightness = soilMinLight + Math.random() * (soilMaxLight - soilMinLight)
  return "hsl(" + soilHue + ", 100%, " + lightness + "%)"
}

function initGrassColor() {
  let grassHue = 126
  let grassMinLight = 35
  let grassMaxLight = 60
  let lightness = grassMinLight + Math.random() * (grassMaxLight - grassMinLight)
  return "hsl(" + grassHue + ", 100%, " + lightness + "%)"
}

function initFlowers(w, h, count) {
  let flowers = []
  let flowerPosX = 100 + Math.random() * (w - 200)
  let flowerPosY = 100 + Math.random() * (h - 200)
  flowers.push(createFlower(flowerPosX, flowerPosY, 7))

  let radius = 100
  for (let i = 0; i < count - 1; i++) {
    let angle = Math.random() * Math.PI * 2
    let x = flowerPosX + Math.cos(angle) * radius
    let y = flowerPosY + Math.sin(angle) * radius

    if (x < 100 || y < 100 || x > (w - 100) || y > (h - 100)) {
      x = 100 + Math.random() * (w - 200)
      y = 100 + Math.random() * (h - 200)
    }

    flowers.push(createFlower(x, y, 4))
    flowerPosX = x
    flowerPosY = y
  }

  return flowers
}

function createFlower(x, y, age = 0) {
  let stemHue = 123
  let stemMinLight = 10
  let stemMaxLight = 25

  let pollenHue = 45
  let pollenMinLight = 40
  let pollenMaxLight = 60

  let flowerColorBuckets = [
    [3, 55, 65],
    [42, 50, 60],
    [64, 50, 60],
    [197, 30, 60],
    [249, 55, 65],
    [295, 57, 75],
    [359, 70, 80]
  ]

  let leafsCount = 1 + Math.random() * 1
  let leafs = []

  for (let l = 0; l < leafsCount; l++) {
    let leafLength = Math.round(2 + Math.random() * 1)

    let leafForm = []
    for (len = 0; len < leafLength; len++) {
      let rand = Math.random()
      let dir = rand <= 0.6 ? 0 : rand <= 0.8 ? 1 : 2 // Diagonal | Up | Side
      leafForm.push(dir)
    }

    let side = Math.random() > .5 ? 1 : -1
    leafs.push([
      Math.random() * 20 /*base*/,
      side,
      leafForm /*form of the leaf*/
    ])
  }

  let flowerBucketIndex = Math.round(Math.random() * (flowerColorBuckets.length - 1))
  let flowerHue = flowerColorBuckets[flowerBucketIndex][0]
  let lightnessRange = flowerColorBuckets[flowerBucketIndex][2] - flowerColorBuckets[flowerBucketIndex][1]
  let flowerLightness = flowerColorBuckets[flowerBucketIndex][1] + (Math.random() * lightnessRange)
  let stemLightness = stemMinLight + Math.random() * (stemMaxLight - stemMinLight)
  let pollenLightness = pollenMinLight + Math.random() * (pollenMaxLight - pollenMinLight)
  let stemColor = "hsl(" + stemHue + ", 100%, " + stemLightness + "%)"
  let pollenColor = "hsl(" + pollenHue + ", 100%, " + pollenLightness + "%)"
  let flowerColor = "hsl(" + flowerHue + ", 100%, " + flowerLightness + "%)"

  return [
    x,
    y,
    0 /*age*/,
    Math.round(2 + Math.random()) /*width*/,
    Math.round(20 + Math.random() * 30) /*height*/,
    Math.round(15 + Math.random() * 4) /*hor flower size*/,
    Math.round(5 + Math.random() * 4) /*vert flower size*/,
    leafs,
    [stemColor, pollenColor, flowerColor],
    Date.now() - (agePerSec * 1000 * age), /*created at*/
    true,/*has pollen*/
    11 + (Math.random() * 3) /*max age*/
  ]
}
