import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const engine = vi.hoisted(() => ({
  detect: vi.fn(),
  prepare: vi.fn(),
  formats: [] as string[],
}))
vi.mock('barcode-detector/ponyfill', () => ({
  prepareZXingModule: engine.prepare,
  BarcodeDetector: class {
    constructor({ formats }: { formats: string[] }) {
      engine.formats = formats
    }
    detect = engine.detect
  },
}))
vi.mock('zxing-wasm/reader/zxing_reader.wasm?url', () => ({ default: '/assets/zxing.wasm' }))

function bitmap(width: number, height: number) {
  return { width, height, close: vi.fn() }
}

beforeEach(() => {
  vi.resetModules()
  engine.prepare.mockResolvedValue({})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('loadBarcodeReader', () => {
  test('serves the engine from the app and reads package barcodes only', async () => {
    const { loadBarcodeReader } = await import('./reader')

    await loadBarcodeReader()

    const [[{ overrides }]] = engine.prepare.mock.calls as [
      [{ overrides: { locateFile: (path: string, prefix: string) => string } }],
    ]
    expect(overrides.locateFile('zxing_reader.wasm', 'https://cdn/')).toBe('/assets/zxing.wasm')
    expect(overrides.locateFile('other.js', 'https://cdn/')).toBe('https://cdn/other.js')
    expect(engine.formats).toEqual(['ean_13', 'ean_8', 'upc_a', 'itf'])
  })

  test('gives the first valid barcode, as stored', async () => {
    engine.detect.mockResolvedValue([{ rawValue: 'not-a-code' }, { rawValue: '036000291452' }])
    const { loadBarcodeReader } = await import('./reader')

    const reader = await loadBarcodeReader()

    await expect(reader.read({} as ImageBitmapSource)).resolves.toBe('0036000291452')
    engine.detect.mockResolvedValue([])
    await expect(reader.read({} as ImageBitmapSource)).resolves.toBeNull()
  })

  test('is loaded once, and tried again after a failed load', async () => {
    engine.prepare.mockRejectedValueOnce(new Error('offline'))
    const { loadBarcodeReader } = await import('./reader')

    await expect(loadBarcodeReader()).rejects.toThrow('offline')
    const first = await loadBarcodeReader()
    const second = await loadBarcodeReader()

    expect(second).toBe(first)
    expect(engine.prepare).toHaveBeenCalledTimes(2)
  })
})

describe('readImageFile', () => {
  test('a small photo is read as it is', async () => {
    const photo = bitmap(800, 600)
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(photo))
    engine.detect.mockResolvedValue([{ rawValue: '3017620422003' }])
    const { readImageFile } = await import('./reader')

    await expect(readImageFile(new Blob())).resolves.toBe('3017620422003')
    expect(engine.detect).toHaveBeenCalledWith(photo)
    expect(photo.close).toHaveBeenCalled()
  })

  test('a big photo is read smaller first, then at full size if that found nothing', async () => {
    const photo = bitmap(4032, 3024)
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(photo))
    engine.detect.mockResolvedValueOnce([]).mockResolvedValueOnce([{ rawValue: '96385074' }])
    const { readImageFile } = await import('./reader')

    await expect(readImageFile(new Blob())).resolves.toBe('96385074')
    const [small] = engine.detect.mock.calls[0] ?? []
    expect(small).toMatchObject({ width: 1600, height: 1200 })
    expect(engine.detect).toHaveBeenLastCalledWith(photo)
  })
})
