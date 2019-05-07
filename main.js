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

  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    start: false,

    kb: {
      codes: [13, 32, 37, 38, 39, 40],
      mapping: {
        13: 'start',
        32: 'jump',
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
      },
      onPress (keyEvent) {
        const { which } = keyEvent
        if (input.kb.codes.includes(which)) {
          keyEvent.preventDefault()
          if (which in input.kb.mapping) {
            input[input.kb.mapping[which]] = true
            console.log('mapped key press', which, input.kb.mapping[which])
          }
        } else {
          console.log('unmapped key press', which)
        }
      },
      onRelease (keyEvent) {
        const { which } = keyEvent
        if (input.kb.codes.includes(which)) {
          keyEvent.preventDefault()
          if (which in input.kb.mapping) {
            input[input.kb.mapping[which]] = false
            console.log('mapped key release', which, input.kb.mapping[which])
          }
        } else {
          console.log('unmapped key release', which)
        }
      }
    },

    create () {
      window.addEventListener('keydown', input.kb.onPress)
      window.addEventListener('keyup', input.kb.onRelease)
    },

    destroy () {
      window.removeEventListener('keydown', input.kb.onPress)
      window.removeEventListener('keyup', input.kb.onRelease)
    }
  }

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

    input.create()

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

    const playerSprite = {
      animations: {
        idle: [
          {
            region: { srcX: 0, srcY: 0, srcW: 32, srcH: 32 },
            collision: [
              { x: 0, y: 0 },
              { x: 32, y: 0 },
              { x: 32, y: 32 },
              { x: 0, y: 32 }
            ]
          },
          {
            region: { srcX: 32, srcY: 0, srcW: 32, srcH: 32 },
            collision: [
              { x: 0, y: 0 },
              { x: 32, y: 0 },
              { x: 32, y: 32 },
              { x: 0, y: 32 }
            ]
          },
          {
            region: { srcX: 96, srcY: 0, srcW: 32, srcH: 32 },
            collision: [
              { x: 0, y: 0 },
              { x: 32, y: 0 },
              { x: 32, y: 32 },
              { x: 0, y: 32 }
            ]
          }
        ],
        walk: [
          { srcX: 0, srcY: 32, srcW: 32, srcH: 32 },
          { srcX: 32, srcY: 32, srcW: 32, srcH: 32 },
          { srcX: 96, srcY: 32, srcW: 32, srcH: 32 }
        ]
      },
      animation: 'idle',
      frame: 0,
      speed: 15
    }

    const animation = {
      ANIM_LOOP: 0,
      ANIM_PINGPONG: 1,
      ANIM_ONCE: 2,

      create ({ name, duration = 1, frames, type = 0, onComplete, onLoop, onPing, onPong }) {
        const anim = {
          name,
          type,
          duration: duration / frames.length,
          playing: false,
          complete: false,
          ping: false,
          time: 0,
          frame: 0,
          frames: frames.slice()
        }

        const tickAnim = deltaTime => {
          anim.time += deltaTime
          return anim.time >= anim.duration
        }

        const nextFrame = () => {
          anim.frame += 1
          return anim.frame >= anim.frames.length
        }

        const previousFrame = () => {
          anim.frame -= 1
          return anim.frame < 0
        }

        if (type === animation.ANIM_LOOP) {
          anim.update = deltaTime => {
            if (anim.playing) {
              if (tickAnim(deltaTime)) {
                anim.time = 0
                if (nextFrame()) {
                  anim.frame = 0
                  onLoop && onLoop()
                }
              }
            }
          }
        } else if (type === animation.ANIM_PINGPONG) {
          anim.update = deltaTime => {
            if (anim.playing) {
              if (tickAnim(deltaTime)) {
                const frameChange = anim.ping ? previousFrame : nextFrame
                if (frameChange()) {
                  anim.frame = anim.ping ? anim.frames.length - 1 : 0
                  anim.ping = !anim.ping
                  anim.ping && onPing && onPing()
                  !anim.ping && onPong && onPong()
                }
              }
            }
          }
        } else if (type === animation.ANIM_ONCE) {
          anim.update = deltaTime => {
            if (anim.playing) {
              if (tickAnim(deltaTime)) {
                anim.time = 0
                if (nextFrame()) {
                  anim.frame = anim.frames.length - 1
                  anim.playing = false
                  anim.complete = true
                  onComplete && onComplete()
                }
              }
            }
          }
        }

        return anim
      }
    }

    demo.player = {
      x: (screen.width / 2) - 128,
      y: (screen.height / 2) + 3,
      animations: {
        idle: animation.create({ name: 'idle', frames: [0, 1, 2], duration: 0.7 }),
        walk: animation.create({ name: 'walk', frames: [3, 4, 5], duration: 0.4 })
      },
      currentAnimationName: 'idle',
      setAnimation (name) {
        const player = demo.player
        if (player.currentAnimationName !== name) {
          player.currentAnimationName = name
          const anim = player.animations[player.currentAnimationName]
          anim.frame = 0
          anim.playing = true
        }
      },
      update (deltaTime) {
        const player = demo.player

        const anim = player.animations[player.currentAnimationName]
        anim.update(deltaTime)
        // console.log(anim.frame)
        // console.log({ ...anim })
        // player.x += deltaTime * 120
        // player.y += deltaTime * 9.8 * 120

        if (input.right) {
          player.setAnimation('walk')
          player.x += deltaTime * 120
        } else if (input.left) {
          player.setAnimation('walk')
          player.x -= deltaTime * 120
        }

        if (!input.right && !input.left) {
          player.setAnimation('idle')
        }
      },
      draw () {
        const player = demo.player
        const anim = player.animations[player.currentAnimationName]
        const frameId = anim.frames[anim.frame]

        const srcX = ~~(frameId % 3) * 32
        const srcY = ~~(frameId / 3) * 32

        // console.log({ frame: anim.frame, srcX, srcY })

        blit({
          image: resources.images.player,
          srcX,
          srcY,
          srcW: 32,
          srcH: 32,
          dstX: ~~(demo.player.x),
          dstY: ~~(demo.player.y),
          dstW: 32,
          dstH: 32
        })
      }
    }

    resolve()
  })

  demo.start = () => {
    console.log('demo start')
    demo.player.animations[demo.player.currentAnimationName].playing = true
  }

  demo.update = deltaTime => {
    demo.player.update(deltaTime)
  }

  demo.draw = () => {
    screen.clear()
    demo.tilemap.draw()
    demo.player.draw()
  }

  const start = () => {
    console.log('starting...')

    const getTicks = () => (new Date()).getTime()
    let lastTime = getTicks()
    demo.start && demo.start()
    const mainLoop = () => {
      const currentTime = getTicks()
      const deltaTime = (currentTime - lastTime) * 0.001
      demo.update && demo.update(deltaTime)
      lastTime = currentTime
      demo.draw && demo.draw()
      window.requestAnimationFrame(mainLoop)
    }
    mainLoop()
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready')
    const manifest = [
      { id: 'tileset', type: 'image', src: 'set-1.png' },
      { id: 'player', type: 'image', src: 'player.png' }
    ]
    preload(manifest).then(create).then(start)
  })
})(window.RML || {})
