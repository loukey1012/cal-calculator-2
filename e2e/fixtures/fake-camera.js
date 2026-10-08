// Injected into the page by the live scanner journey: the "camera" films the picture in
// window.__fakeCameraPicture (a canvas stream), which the real scanner reads like a camera.
Object.defineProperty(navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: async () => {
      const image = new Image()
      image.src = window.__fakeCameraPicture
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const context = canvas.getContext('2d')
      const draw = () => {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(
          image,
          (canvas.width - image.width) / 2,
          (canvas.height - image.height) / 2,
        )
        requestAnimationFrame(draw)
      }
      draw()
      return canvas.captureStream(10)
    },
  },
})
