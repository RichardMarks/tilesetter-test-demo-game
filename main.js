(function (RML) {
  const TILE_WIDTH = 16
  const TILE_HEIGHT = 16
  const MAP_WIDTH = 30
  const MAP_HEIGHT = 20
  const MAP_DATA = [
    17, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 18,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 34,
    35, 36, 0, 0, 0, 34, 35, 36, 0, 15,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 38,
    35, 36, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 4, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 15, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 26, 0, 0, 0, 0, 0, 0, 12,
    14, 34, 35, 36, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 34, 35, 36, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 1, 2, 3, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 12, 13, 14, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 1, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 29, 13, 28, 2, 2,
    2, 2, 2, 3, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 12, 13, 13, 13, 13,
    13, 13, 13, 13, 13, 13, 13, 13, 13, 13,
    13, 13, 13, 14, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 12, 13, 13, 13, 13,
    13, 13, 13, 13, 13, 13, 13, 13, 13, 13,
    13, 13, 13, 14, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 23, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 25, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12,
    14, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 12
  ]

  const screen = RML.Screen.create(MAP_WIDTH * TILE_WIDTH, MAP_HEIGHT * TILE_HEIGHT)

  const demo = {}

  const resources = { images: {} }

  const preload = (manifest) => new Promise((resolve, reject) => {
    console.log('preloading...')
    let loaded = 0
    const toLoad = manifest.length
    manifest.forEach(spec => {
      if (spec.type === 'image') {
        const imageResource = new Image()
        imageResource.onerror = err => reject(err)
        imageResource.onload = () => {
          resources.images[spec.id] = imageResource
          loaded += 1
          console.log(`loaded resource ${loaded} of ${toLoad}`)
          if (loaded >= toLoad) {
            console.log('all resources loaded')
            resolve()
          }
        }
        imageResource.src = spec.src
      }
    })
  })

  const create = () => new Promise((resolve, reject) => {
    console.log('creating...')

    const tilesAcross = resources.images.tileset.width / TILE_WIDTH
    const tilesDown = resources.images.tileset.height / TILE_HEIGHT
    const tileCount = tilesAcross * tilesDown
    demo.tileset = {}
    for (let i = 0; i < tileCount; i += 1) {
      const srcX = ~~(i % tilesAcross) * TILE_WIDTH
      const srcY = ~~(i / tilesAcross) * TILE_HEIGHT
      demo.tileset[i + 1] = { srcX, srcY, srcW: TILE_WIDTH, srcH: TILE_HEIGHT }
    }

    const { blit } = screen

    demo.tilemap = {
      draw () {
        const Z = 1
        const mapSize = MAP_DATA.length
        const { tileset } = demo
        for (let i = 0; i < mapSize; i += 1) {
          const tileId = MAP_DATA[i]
          if (tileId !== 0) {
            const { srcX, srcY, srcW, srcH } = tileset[tileId]
            const dstX = ~~(i % MAP_WIDTH) * (TILE_WIDTH * Z)
            const dstY = ~~(i / MAP_WIDTH) * (TILE_HEIGHT * Z)
            const image = resources.images.tileset

            blit({
              image,
              srcX, srcY,
              srcW, srcH,
              dstX, dstY,
              dstW: TILE_WIDTH * Z,
              dstH: TILE_HEIGHT * Z
            })
          }
        }
      }
    }

    resolve()
  })

  const start = () => {
    console.log('starting...')

    screen.clear()
    demo.tilemap.draw()
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready')
    const manifest = [
      { id: 'tileset', type: 'image', src: 'set-1.png' }
    ]
    preload(manifest).then(create).then(start)
  })
})(window.RML || {})
