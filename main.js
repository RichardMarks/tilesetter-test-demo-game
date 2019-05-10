(function (RML) {
  const TILE_WIDTH = 16
  const TILE_HEIGHT = 16
  const SCREEN_WIDTH = 30 * TILE_WIDTH
  const SCREEN_HEIGHT = 20 * TILE_HEIGHT

  // FIXME: read from an environment variable or something
  const devmode = true

  const { min: mathMin, max: mathMax, abs: mathAbs, sqrt: mathSqrt } = Math

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
        enemies,
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

      // load enemy data
      console.log(`loading enemy data... ${enemies.length} enemies`)
      demo.enemies.instances = enemies.map((enemy, index) => demo.enemyFactory.load({...enemy, id: index }))

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

    const animatedsprite = {
      create ({ x, y, w, h, imageId }) {
        const sprite = {
          x,
          y,
          w,
          h,
          imageId,
          animations: {},
          currentAnimationName: '',
          mirror: false,
          visible: true,
          addAnimation (name, anim) {
            if (name in sprite.animations) {
              console.warn(`possibly not intentionally replacing animation ${name} with new animation!`)
            }
            sprite.animations[name] = anim
          },
          setAnimation (name) {
            if (!name in sprite.animations) {
              throw new Error(`animation ${name} not found`)
            }
            if (sprite.currentAnimationName !== name) {
              sprite.currentAnimationName = name
              const anim = sprite.animations[name]
              anim.frame = 0
              anim.playing = true
            }
          },
          pauseAnim () {
            const anim = sprite.animations[sprite.currentAnimationName]
            anim && (anim.playing = false)
          },
          resumeAnim () {
            const anim = sprite.animations[sprite.currentAnimationName]
            anim && (anim.playing = true)
          },
          update (deltaTime) {
            sprite.onUpdate && typeof sprite.onUpdate === 'function' && sprite.onUpdate(deltaTime)

            const anim = sprite.animations[sprite.currentAnimationName]
            anim && anim.update(deltaTime)
          },
          draw () {
            sprite.onDraw && typeof sprite.onDraw === 'function' && sprite.onDraw()

            if (
              !sprite.visible ||
              sprite.x > SCREEN_WIDTH ||
              sprite.y > SCREEN_HEIGHT ||
              sprite.x + sprite.w < 0 ||
              sprite.y + sprite.h < 0 ||
              !sprite.currentAnimationName ||
              sprite.currentAnimationName === '') {
              return
            }

            const { x, y, w, h, imageId } = sprite

            const anim = sprite.animations[sprite.currentAnimationName]
            const frameId = anim.frames[anim.frame]
            const frameCount = anim.frames.length

            const image = resources.images[imageId]
            if (!image) {
              throw new Error(`image resource not found: ${imageId}`)
            }

            const srcX = ~~(frameId % frameCount) * w
            const srcY = ~~(frameId / frameCount) * h

            if (sprite.mirror) {
              const px = ~~(x)
              const py = ~~(y)
              screen.ctx.save()
              screen.ctx.translate(px + w, py)
              screen.ctx.scale(-1, 1)
              blit({
                image,
                srcX,
                srcY,
                srcW: w,
                srcH: h,
                dstX: 0,
                dstY: 0,
                dstW: w,
                dstH: h
              })
              screen.ctx.restore()
            } else {
              blit({
                image,
                srcX,
                srcY,
                srcW: w,
                srcH: h,
                dstX: ~~(x),
                dstY: ~~(y),
                dstW: w,
                dstH: h
              })
            }
          }
        }
        return sprite
      }
    }

    const physicsbody = {
      create ({ x, y, w, h }) {
        const body = {
          x,
          y,
          w,
          h,
          update (deltaTime) {
            body.onUpdate && typeof body.onUpdate === 'function' && body.onUpdate(deltaTime)
          }
        }
        return body
      }
    }

    demo.player = animatedsprite.create({ x: 0, y: 0, w: 32, h: 32, imageId: 'player' })
    demo.player.addAnimation('idle', animation.create({ name: 'idle', frames: [0, 1, 2], duration: 0.7 }))
    demo.player.addAnimation('walk', animation.create({ name: 'walk', frames: [3, 4, 5], duration: 0.4 }))
    demo.player.setAnimation('idle')
    demo.player.onUpdate = deltaTime => {
      // sync the player graphics with the physics body
      demo.player.x = demo.playerCollider.x
      demo.player.y = demo.playerCollider.y - 3
    }

    demo.enemyFactory = {
      load (instanceData) {
        const factory = demo.enemyFactory.factories[instanceData.type]
        if (factory) {
          return factory(instanceData)
        }
        console.log(`unknown enemy factory: ${instanceData.type}`)
        return null
      },
      factories: {
        flying_enemy: (instanceData) => {
          const { x, y, type } = instanceData
          const enemy = {
            ...instanceData,
            sprite: animatedsprite.create({ x, y, w: 32, h: 32, imageId: type }),
            collider: physicsbody.create({ x, y, w: 32, h: 32 }),
            ai: {
              state: 'wait',
              time: 0,
              waitTime: 3,
              attackTime: 1,
              startX: x,
              startY: y
            }
          }
          enemy.sprite.addAnimation('idle', animation.create({ name: 'idle', frames: [0, 1, 2], duration: 0.2 }))
          enemy.sprite.setAnimation('idle')
          enemy.sprite.onUpdate = deltaTime => {
            enemy.sprite.x = enemy.collider.x
            enemy.sprite.y = enemy.collider.y
          }
          enemy.collider.onUpdate = deltaTime => {
            switch (enemy.ai.state) {
              case 'wait': {
                enemy.ai.time += deltaTime
                if (enemy.ai.time >= enemy.ai.waitTime) {
                  enemy.ai.time -= enemy.ai.waitTime
                  enemy.ai.state = 'seek'
                }
              } break
              case 'seek': {
                enemy.ai.targetX = demo.playerCollider.x
                enemy.ai.targetY = demo.playerCollider.y
                const ecx = enemy.collider.x // + enemy.collider.w * 0.5
                const ecy = enemy.collider.y // + enemy.collider.h * 0.5
                const tx = enemy.ai.targetX
                const ty = enemy.ai.targetY
                const dx = tx - ecx
                const dy = ty - ecy
                const dx2 = dx * dx
                const dy2 = dy * dy
                const dist = mathSqrt(dx2 + dy2)
                if (dist < 200) {
                  enemy.ai.state = 'attack'
                  enemy.ai.moveX = (dx / dist) * 100 * deltaTime
                  enemy.ai.moveY = (dy / dist) * 100 * deltaTime
                }
              } break
              case 'attack': {
                enemy.sprite.mirror = enemy.ai.moveX > 0
                enemy.collider.x += enemy.ai.moveX
                enemy.collider.y += enemy.ai.moveY
                if (mathAbs(enemy.collider.x - enemy.ai.targetX) + mathAbs(enemy.collider.y - enemy.ai.targetY) <= 16) {
                  enemy.ai.state = 'return'
                }

                // enemy.ai.time += deltaTime
                // if (enemy.ai.time >= enemy.ai.attackTime) {
                //   enemy.ai.time -= enemy.ai.attackTime
                //   enemy.ai.state = 'return'
                // }
              } break
              case 'return': {
                const ecx = enemy.collider.x // + enemy.collider.w * 0.5
                const ecy = enemy.collider.y // + enemy.collider.h * 0.5
                const tx = enemy.ai.startX
                const ty = enemy.ai.startY
                const dx = tx - ecx
                const dy = ty - ecy
                const dx2 = dx * dx
                const dy2 = dy * dy
                const dist = mathSqrt(dx2 + dy2)
                enemy.ai.state = 'returning'
                enemy.ai.moveX = (dx / dist) * 48 * deltaTime
                enemy.ai.moveY = (dy / dist) * 48 * deltaTime
              } break
              case 'returning': {
                enemy.sprite.mirror = enemy.ai.moveX > 0
                enemy.collider.x += enemy.ai.moveX
                enemy.collider.y += enemy.ai.moveY
                if (mathAbs(enemy.collider.x - enemy.ai.startX) + mathAbs(enemy.collider.y - enemy.ai.startY) <= 16) {
                  enemy.collider.x = enemy.ai.startX
                  enemy.collider.y = enemy.ai.startY
                  enemy.ai.state = 'wait'
                }
              } break
              default: break
            }
          }
          return enemy
        }
      }
    }

    demo.enemies = {
      instances: [],
      removed: [],
      update (deltaTime) {
        demo.enemies.instances.forEach(instance => demo.enemies.updateInstance(instance, deltaTime))
        demo.enemies.removed.forEach(instance => {
          const start = demo.enemies.instances.findIndex(inst => inst.id === instance.id)
          const deleteCount = 1
          if (start >= 0) {
            demo.enemies.instances.splice(start, deleteCount)
          }
        })
        demo.enemies.removed = []
      },
      draw () {
        demo.enemies.instances.forEach(demo.enemies.drawInstance)
      },
      updateInstance (instance, deltaTime) {
        const { collider, sprite, removed } = instance
        if (removed) {
          // removed enemies should not be updated
          return
        }

        collider && collider.update && typeof collider.update === 'function' && collider.update(deltaTime)
        sprite && sprite.update && typeof sprite.update === 'function' && sprite.update(deltaTime)

        // collision with player results in damaging the player unless
        // player is above the enemy and player is falling
        const { playerCollider: pc } = demo
        const { x, y, w, h } = pc
        const bottom = y + h
        const right = x + w
        const { x: bx, y: by, w: bw, h: bh } = collider

        if (!((bottom <= by) || (y >= by + bh) || (x >= bx + bw) || (right <= bx))) {
          // console.log('collided with enemy')

          // is the player going to damage/kill the enemy?
          const isPlayerAboveEnemy = y < by
          const isPlayerFalling = !pc.platform.onGround && pc.platform.ySpeed > 0
          const playerWillTakeDamage = !(isPlayerAboveEnemy && isPlayerFalling)

          if (playerWillTakeDamage) {
            if (!instance.causingDamage) {
              instance.causingDamage = true
              demo.playerHealthBar.damage()
            }
          } else {
            // player will "bounce" up a bit
            pc.platform.ySpeed = -(pc.platform.jumpSpeed * 1.3)
            pc.platform.isJumping = true
            // enemies have no health, so die immediately
            // todo - give enemies health
            messages.add('increase-score', {...instance})
            instance.removed = true
            demo.enemies.removed.push(instance)
          }
        } else {
          instance.causingDamage = false
        }
      },
      drawInstance (instance) {
        const { sprite, removed } = instance
        if (removed) {
          // removed enemies should not be drawn
          return
        }

        sprite && sprite.draw && typeof sprite.draw === 'function' && sprite.draw()
      },
      drawDebug () {
        const { instances } = demo.enemies

        screen.ctx.globalAlpha = 0.3
        screen.ctx.fillStyle = '#f00'
        for (let i = 0; i < instances.length; i += 1) {
          const { collider, ai } = instances[i]
          const { x, y, w, h } = collider
          screen.ctx.fillRect(x, y, w, h)
          if (ai) {
            screen.ctx.beginPath()
            screen.ctx.strokeStyle = '#fff'
            screen.ctx.moveTo(ai.startX, 0)
            screen.ctx.lineTo(ai.startX, SCREEN_HEIGHT)
            screen.ctx.moveTo(0, ai.startY)
            screen.ctx.lineTo(SCREEN_WIDTH, ai.startY)
            screen.ctx.stroke()
          }
        }
        screen.ctx.fillStyle = '#000'
        screen.ctx.globalAlpha = 1
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
        if (!platform.onGround && willBeOnGround) {
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
        platform.ySpeed = clamp(platform.ySpeed, -platform.jumpSpeed * 2, platform.gravity)

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

    demo.playerHealthBar = {
      value: 5,
      maxValue: 5,

      damage () {
        demo.playerHealthBar.value -= 1
        if (demo.playerHealthBar.value < 0) {
          demo.playerHealthBar.value = 0
          // messages.add('player-death')
          messages.add('restart')
        }
      },

      restore () {
        demo.playerHealthBar.value = demo.playerHealthBar.maxValue
      },

      draw () {
        screen.ctx.save()
        screen.ctx.font = '8px "Press Start 2P"'
        screen.ctx.fillStyle = '#fff'
        screen.ctx.textBaseline = 'top'
        screen.ctx.textAlign = 'right'
        screen.ctx.fillText('HEALTH:', ~~(SCREEN_WIDTH * 0.5), 1)

        for (let i = 0; i < demo.playerHealthBar.maxValue; i += 1) {
          if (i < demo.playerHealthBar.value) {
            screen.ctx.fillStyle = '#f00'
          } else {
            screen.ctx.fillStyle = '#333'
          }
          const x = SCREEN_WIDTH * 0.5 + (i * 10)
          screen.ctx.fillRect(~~(x), 1, 8, 8)
        }
        screen.ctx.restore()
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
    demo.enemies.update(deltaTime)
  }

  demo.draw = () => {
    screen.clear()
    demo.tilemap.draw()
    demo.items.draw()
    demo.enemies.draw()
    // demo.enemies.drawDebug()
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
    demo.playerHealthBar.draw()
  }

  demo.restart = () => {
    demo.score = 0

    demo.playerHealthBar.restore()

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

  const getPoints = type => {
    switch (type) {
      case 'flying_enemy': return 100
      case 'fruit': return 10
      default:
        return 5
    }
  }

  const handleMessage = message => {
    console.log('handleMessage got message')
    console.log({ message })

    if (message.type === 'restart') {
      demo.restart()
      return true
    } else if (message.type === 'increase-score') {
      const points = getPoints(message.data[0].type)
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
      { id: 'flying_enemy', type: 'image', src: 'flying-enemy.png' },
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
