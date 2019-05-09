(function (RML) {
  const TILE_WIDTH = 16
  const TILE_HEIGHT = 16
  const SCREEN_WIDTH = 30 * TILE_WIDTH
  const SCREEN_HEIGHT = 20 * TILE_HEIGHT

  // FIXME: read from an environment variable or something
  const devmode = true

  const { min: mathMin, max: mathMax, abs: mathAbs } = Math

  const sign = v => (v > 0) - (v < 0)
  const clamp = (v, low, high) => mathMax(low, mathMin(high, v))
  const lerp = (a, b, t) => a * (1.0 - t) + b * t

  const screen = RML.Screen.create(SCREEN_WIDTH, SCREEN_HEIGHT)

  const messages = {
    queue: [],
    peek: () => messages.queue.length ? messages.queue[messages.queue.length - 1] : null,
    next: () => messages.queue.length ? messages.queue.pop() : null,
    add (type, ...params) {
      const message = { type, data: {...params} }
      messages.queue = [message, ...messages.queue]
    }
  }

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
        38: 'jump',
        39: 'right',
        40: 'down'
      },
      onPress (keyEvent) {
        const { which } = keyEvent
        if (input.kb.codes.includes(which)) {
          keyEvent.preventDefault()
          if (which in input.kb.mapping) {
            input[input.kb.mapping[which]] = true
            // console.log('mapped key press', which, input.kb.mapping[which])
          }
        } else {
          // R key to restart in dev mode
          if (devmode && which === 82) {
            messages.add('restart')
            return
          }
          console.log('unmapped key press', which)
        }
      },
      onRelease (keyEvent) {
        const { which } = keyEvent
        if (input.kb.codes.includes(which)) {
          keyEvent.preventDefault()
          if (which in input.kb.mapping) {
            input[input.kb.mapping[which]] = false
            // console.log('mapped key release', which, input.kb.mapping[which])
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

  const demo = {
    score: 0
  }

  const resources = { images: {} }

  const level = {
    load (levelNumber) {
      const levelId = `level${levelNumber}`
      if (levelId in resources.levels) {
        const data = level.parseLevel(resources.levels[levelId], levelNumber)
        return data
      }
      return null
    },

    parseLevel (levelJSON, levelNumber) {
      const {
        height,
        items,
        name,
        playerX,
        playerY,
        solids,
        tiles,
        width
      } = levelJSON

      console.log(`loading level ${levelNumber} [${name}] ...`)
      demo.level.number = levelNumber
      demo.level.name = name

      // load tilemap data
      demo.level.width = width
      demo.level.height = height
      demo.level.tiles = [...tiles]
      console.log(`level size ${width} x ${height}`)
      console.log(`tiles: ${tiles.length} / ${width * height}`)

      // load collision data
      console.log(`loading collision data... ${solids.length} collidables`)
      demo.world.solids = [...solids]

      // load item data
      console.log(`loading item data... ${items.length} items`)
      demo.items.instances = items.map((item, index) => ({ ...item, id: index }))

      // position the player
      console.log(`positioning player at ${playerX}, ${playerY}`)
      demo.playerCollider.x = playerX
      demo.playerCollider.y = playerY

      console.log('load complete')
    }
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
      } else if (spec.type === 'json') {
        const req = new XMLHttpRequest()
        req.onreadystatechange = () => {
          if (req.readyState === 4) {
            if (req.status === 200) {
              if (! ('levels' in resources)) {
                resources.levels = {}
              }
              resources.levels[spec.id] = JSON.parse(req.responseText)
              loaded += 1
              console.log(`loaded resource ${loaded} of ${toLoad}`)
              if (loaded >= toLoad) {
                console.log('all resources loaded')
                resolve()
              }
            } else {
              reject(new Error(`Failed to load ${spec.id} from ${spec.src} Status Code: ${req.status}`))
            }
          }
        }
        req.open('GET', spec.src, true)
        req.send()
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

    demo.level = {
      width: 0,
      height: 0,
      tiles: [],
      name: '',
      number: 0
    }

    demo.tilemap = {
      draw () {
        const {
          width: levelWidth,
          // height: levelHeight,
          tiles: levelTiles
        } = demo.level

        const mapSize = levelTiles.length
        const { tileset } = demo
        const image = resources.images.tileset

        for (let i = 0; i < mapSize; i += 1) {
          const tileId = levelTiles[i]
          if (tileId !== 0) {
            const { srcX, srcY, srcW, srcH } = tileset[tileId]
            const dstX = ~~(i % levelWidth) * TILE_WIDTH
            const dstY = ~~(i / levelWidth) * TILE_HEIGHT

            blit({
              image,
              srcX, srcY,
              srcW, srcH,
              dstX, dstY,
              dstW: TILE_WIDTH,
              dstH: TILE_HEIGHT
            })
          }
        }
      }
    }

    demo.player = {
      x: 0,
      y: 0,
      animations: {
        idle: animation.create({ name: 'idle', frames: [0, 1, 2], duration: 0.7 }),
        walk: animation.create({ name: 'walk', frames: [3, 4, 5], duration: 0.4 })
      },
      currentAnimationName: 'idle',
      mirror: false,
      setAnimation (name) {
        const player = demo.player
        if (player.currentAnimationName !== name) {
          player.currentAnimationName = name
          const anim = player.animations[player.currentAnimationName]
          anim.frame = 0
          anim.playing = true
        }
      },
      pauseAnim () {
        const player = demo.player
        const anim = player.animations[player.currentAnimationName]
        anim.playing = false
      },
      resumeAnim () {
        const player = demo.player
        const anim = player.animations[player.currentAnimationName]
        anim.playing = true
      },
      update (deltaTime) {
        const player = demo.player
        // sync the player graphics with the physics body
        player.x = demo.playerCollider.x
        player.y = demo.playerCollider.y - 3

        // update the animation
        const anim = player.animations[player.currentAnimationName]
        anim.update(deltaTime)
      },
      draw () {
        const player = demo.player
        const anim = player.animations[player.currentAnimationName]
        const frameId = anim.frames[anim.frame]

        const srcX = ~~(frameId % 3) * 32
        const srcY = ~~(frameId / 3) * 32

        // console.log({ frame: anim.frame, srcX, srcY })

        if (player.mirror) {
          const px = ~~(demo.player.x)
          const py = ~~(demo.player.y)
          screen.ctx.save()
          screen.ctx.translate(px + 32, py)
          screen.ctx.scale(-1, 1)
          blit({
            image: resources.images.player,
            srcX,
            srcY,
            srcW: 32,
            srcH: 32,
            dstX: 0,
            dstY: 0,
            dstW: 32,
            dstH: 32
          })
          screen.ctx.restore()
        } else {
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
    }

    demo.items = {
      instances: [],
      removed: [],
      update (deltaTime) {
        demo.items.instances.forEach(instance => demo.items.updateInstance(instance, deltaTime))
        demo.items.removed.forEach(instance => {
          const start = demo.items.instances.findIndex(inst => inst.id === instance.id)
          const deleteCount = 1
          if (start >= 0) {
            demo.items.instances.splice(start, deleteCount)
          }
        })
        demo.items.removed = []
      },
      draw () {
        demo.items.instances.forEach(demo.items.drawInstance)
      },
      updateInstance (instance, deltaTime) {
        if (instance.type === 'fruit') {
          const { playerCollider: collider } = demo
          const { x, y, w, h } = collider
          const bottom = y + h
          const right = x + w
          const { x: bx, y: by } = instance
          // all items are assumed to be 16 x 16 here
          const bw = 16
          const bh = 16
          if (!((bottom <= by) || (y >= by + bh) || (x >= bx + bw) || (right <= bx))) {
            messages.add('increase-score', {...instance})
            instance.removed = true
            demo.items.removed.push(instance)
          }
        }
      },
      drawInstance (instance) {
        const { type, x, y, removed } = instance
        if (removed) {
          // removed items should not be drawn
          return
        }
        const image = resources.images[type]

        blit({
          image,
          srcX: 0,
          srcY: 0,
          srcW: image.width,
          srcH: image.height,
          dstX: ~~(x),
          dstY: ~~(y),
          dstW: 16,
          dstH: 16
        })
      },
      drawDebug () {
        const { instances } = demo.items

        screen.ctx.globalAlpha = 0.3
        screen.ctx.fillStyle = '#f00'
        for (let i = 0; i < instances.length; i += 1) {
          const { x, y } = instances[i]
          screen.ctx.fillRect(x, y, 16, 16)
        }
        screen.ctx.fillStyle = '#000'
        screen.ctx.globalAlpha = 1
      }
    }

    demo.world = {
      solids: [],
      ptCollides (x, y) {
        const { solids } = demo.world
        const { length: count } = solids
        for (let i = 0; i < count; i += 1) {
          const [bx, by, bw, bh] = solids[i]
          if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
            return true
          }
        }
        return false
      },
      rectCollides (x, y, w, h) {
        const { solids } = demo.world
        const { length: count } = solids
        const right = x + w
        const bottom = y + h
        for (let i = 0; i < count; i += 1) {
          const [bx, by, bw, bh] = solids[i]
          if (!((bottom <= by) || (y >= by + bh) || (x >= bx + bw) || (right <= bx))) {
            return true
          }
        }
        return false
      },
      drawDebug () {
        const { solids } = demo.world

        screen.ctx.globalAlpha = 0.3
        screen.ctx.fillStyle = '#f00'
        for (let i = 0; i < solids.length; i += 1) {
          screen.ctx.fillRect(...solids[i])
        }
        screen.ctx.fillStyle = '#000'
        screen.ctx.globalAlpha = 1
      }
    }

    demo.playerCollider = {
      x: (screen.width / 2) - 160,
      y: (screen.height / 2) - 64,
      w: 32,
      h: 24,

      platform: {
        gravity: 300,
        maxSpeed: 120,
        jumpSpeed: 160,
        acceleration: 600,
        xSpeed: 0,
        ySpeed: 0,
        onGround: false,
        isJumping: false
      },

      update (deltaTime) {
        const player = demo.player
        const world = demo.world
        const { ptCollides, rectCollides } = world
        const collider = demo.playerCollider
        const platform = collider.platform

        let animationChange = false
        let nextAnim = ''

        // ground check
        const willBeOnGround = rectCollides(collider.x, collider.y + 1, collider.w, collider.h)
        if (!player.onGround && willBeOnGround) {
          // landing
          player.resumeAnim()
        }
        platform.onGround = willBeOnGround

        if (platform.onGround) {
          player.animation
          // we are on the ground, stop jumping / vertical motion
          platform.isJumping = false
          platform.ySpeed = 0

          if (input.jump) {
            platform.ySpeed = -platform.jumpSpeed
            platform.isJumping = true
            collider.y -= 1
            player.pauseAnim()
          }
        } else {
          // we are in the air, apply gravity
          platform.ySpeed += platform.gravity * deltaTime
          if (platform.isJumping && !input.jump) {
            platform.ySpeed += platform.gravity * deltaTime
            platform.ySpeed += platform.gravity * deltaTime
          }

          // head check
          if (rectCollides(collider.x, collider.y - 1, collider.w, collider.h)) {
            // step vertical motion
            platform.isJumping = false
            platform.ySpeed = 0
            collider.y += 1
          }
        }

        if (input.right) {
          player.mirror = false
          nextAnim = 'walk'
          animationChange = true
          platform.xSpeed += platform.acceleration * deltaTime
        } else if (input.left) {
          player.mirror = true
          nextAnim = 'walk'
          animationChange = true
          platform.xSpeed -= platform.acceleration * deltaTime
        }

        if (!input.right && !input.left) {
          platform.xSpeed = 0
          nextAnim = 'idle'
          animationChange = true
        }

        platform.xSpeed = clamp(platform.xSpeed, -platform.maxSpeed, platform.maxSpeed)
        platform.ySpeed = clamp(platform.ySpeed, -platform.jumpSpeed, platform.gravity)

        const moveX = platform.xSpeed * deltaTime
        const moveY = platform.ySpeed * deltaTime

        const xDist = mathAbs(moveX)
        const yDist = mathAbs(moveY)

        // step the x axis
        for (let i = 0; i < xDist; i += 1) {
          const step = sign(moveX)
          if (!rectCollides(collider.x + step, collider.y, collider.w, collider.h)) {
            collider.x += step
          }
        }

        // step the y axis
        for (let i = 0; i < yDist; i += 1) {
          const step = sign(moveY)
          if (!rectCollides(collider.x, collider.y + step, collider.w, collider.h)) {
            collider.y += step
          }
        }

        // update animation
        animationChange && player.setAnimation(nextAnim)

        if (collider.y > screen.height) {
          messages.add('restart')
        }
      },

      drawDebug () {
        const { x, y, w, h } = demo.playerCollider

        screen.ctx.globalAlpha = 0.3
        screen.ctx.fillStyle = '#f00'
        screen.ctx.fillRect(x, y, w, h)
        screen.ctx.fillStyle = '#fff'

        screen.ctx.globalAlpha = 1
        screen.ctx.scale(0.25, 0.25)
        screen.ctx.font = '48px monospace'
        const { platform } = demo.playerCollider
        const {
          onGround,
          isJumping,
          xSpeed,
          ySpeed
        } = platform
        const st = { xSpeed, ySpeed, onGround, isJumping}
        const lines = Object.keys(st).map(k => `${k}: ${st[k]}`)
        lines.forEach((line, i) => {
          screen.ctx.fillText(line, 8, 64 + (i * 48))
        })

        screen.ctx.scale(4.0, 4.0)
        screen.ctx.fillStyle = '#000'


      }
    }

    resolve()
  })

  demo.start = () => {
    console.log('demo start')
    demo.score = 0
    demo.player.animations[demo.player.currentAnimationName].playing = true
    level.load(1)
  }

  demo.update = deltaTime => {
    demo.playerCollider.update(deltaTime)
    demo.player.update(deltaTime)
    demo.items.update(deltaTime)
  }

  demo.draw = () => {
    screen.clear()
    demo.tilemap.draw()
    demo.items.draw()
    demo.player.draw()
    // demo.items.drawDebug()
    // demo.world.drawDebug()
    // demo.playerCollider.drawDebug()
    screen.ctx.save()
    screen.ctx.fillRect(0, 0, SCREEN_WIDTH, 10)
    screen.ctx.font = '8px "Press Start 2P"'
    screen.ctx.fillStyle = '#fff'
    screen.ctx.textBaseline = 'top'
    screen.ctx.fillText(`SCORE: ${demo.score}`, 1, 1)
    screen.ctx.restore()
  }

  demo.restart = () => {
    demo.score = 0

    level.load(demo.level.number)

    // reset the player collider
    // FIXME: this is bad practice copy/pasting code
    const platformReset = {
      gravity: 300,
      maxSpeed: 120,
      jumpSpeed: 160,
      acceleration: 600,
      xSpeed: 0,
      ySpeed: 0,
      onGround: false,
      isJumping: false
    }
    // const colliderReset = {
    //   x: (screen.width / 2) - 160,
    //   y: (screen.height / 2) - 64,
    // }
    // apply resets
    demo.playerCollider.platform = {...platformReset}
    // demo.playerCollider = {...demo.playerCollider, ...colliderReset}

    // reset the player
    Object.keys(demo.player.animations).forEach(k => {
      const anim = demo.player.animations[k]
      anim.playing = false
      anim.frame = 0
    })
    demo.player.currentAnimationName = 'idle'
    demo.player.mirror = false
  }

  const handleMessage = message => {
    console.log('handleMessage got message')
    console.log({ message })

    if (message.type === 'restart') {
      demo.restart()
      return true
    } else if (message.type === 'increase-score') {
      const points = message.data[0].type === 'fruit' ? 10 : 5
      demo.score += points
      // console.log(`scored ${points} points`)
      return true
    }

    return false
  }

  const start = () => {
    console.log('starting...')

    const getTicks = () => (new Date()).getTime()
    let lastTime = getTicks()
    demo.start && demo.start()
    const mainLoop = () => {
      const nextMessage = messages.peek()
      if (nextMessage) {
        if (handleMessage(nextMessage)) {
          messages.next()
        }
      }
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
      { id: 'player', type: 'image', src: 'player.png' },
      { id: 'fruit', type: 'image', src: 'fruit.png' },
      { id: 'level1', type: 'json', src: 'level1.json' }
    ]
    preload(manifest).then(create).then(start)

    window.gamedebugobjs = {
      screen,
      demo,
      resources
    }
  })
})(window.RML || {})
