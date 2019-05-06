(function (){
  const RML = {}

  const RMLScreen = {
    create (width, height, containerElement) {
      const screen = {
        get width () { return screen.canvas.width },
        get height () { return screen.canvas.height }
      }
      screen.canvas = document.createElement('canvas')
      screen.canvas.width = width
      screen.canvas.height = height
      screen.canvas.style.imageRendering = 'pixelated'
      screen.canvas.style.transform = 'scale(2,2)'
      screen.ctx = screen.canvas.getContext('2d')

      if (containerElement) {
        containerElement.appendChild(screen.canvas)
      } else {
        document.body.appendChild(screen.canvas)
      }

      screen.clear = () => {
        screen.ctx.fillRect(0, 0, screen.canvas.width, screen.canvas.height)
      }

      screen.blit = ({
        image,
        srcX = 0,
        srcY = 0,
        srcW,
        srcH,
        dstX = 0,
        dstY = 0,
        dstW,
        dstH
      }) => {
        dstW = dstW || srcW
        dstH = dstH || srcH
        screen.ctx.drawImage(image, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)
      }

      return screen
    }
  }

  RML.Screen = RMLScreen

  window.RML = RML
})()
