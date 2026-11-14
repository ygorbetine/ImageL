package org.libjpegturbo.turbojpeg;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

/**
 * ImageL: decodificador JPEG em Java puro com a API do TJDecompressor que o Bio-Formats usa (JPEGTurboServiceImpl,
 * leitores NDPI/Hamamatsu). Usa o javax.imageio no lugar da biblioteca nativa libjpeg-turbo.
 */
public class TJDecompressor {
  private byte[] jpeg;
  private int size;
  private BufferedImage img;

  public TJDecompressor() throws Exception {}

  public TJDecompressor(byte[] jpegImage) throws Exception { setJPEGImage(jpegImage, jpegImage.length); }

  public TJDecompressor(byte[] jpegImage, int imageSize) throws Exception { setJPEGImage(jpegImage, imageSize); }

  public void setJPEGImage(byte[] jpegImage, int imageSize) throws Exception {
    if (jpegImage == null || imageSize < 1) throw new Exception("Invalid argument in setJPEGImage()");
    jpeg = jpegImage;
    size = imageSize;
    img = null;
  }

  private BufferedImage image() throws Exception {
    if (img == null) {
      if (jpeg == null) throw new Exception("No JPEG image is associated with this instance");
      img = javax.imageio.ImageIO.read(new ByteArrayInputStream(jpeg, 0, size));
      if (img == null) throw new Exception("Could not decode JPEG image");
    }
    return img;
  }

  public int getWidth() throws Exception { return image().getWidth(); }

  public int getHeight() throws Exception { return image().getHeight(); }

  public byte[] getJPEGBuf() throws Exception { return jpeg; }

  public int getJPEGSize() throws Exception { return size; }

  /** Decodifica para um buffer com `pitch` bytes por linha no formato de pixel pedido (RGB, BGR, cinza ou 4 canais). */
  public void decompress(byte[] dstBuf, int desiredWidth, int pitch, int desiredHeight, int pixelFormat, int flags) throws Exception {
    BufferedImage im = image();
    int ps = TJ.getPixelSize(pixelFormat);
    int w = desiredWidth > 0 ? Math.min(desiredWidth, im.getWidth()) : im.getWidth();
    int h = desiredHeight > 0 ? Math.min(desiredHeight, im.getHeight()) : im.getHeight();
    if (pitch <= 0) pitch = w * ps;
    int[] row = new int[w];
    for (int y = 0; y < h; y++) {
      im.getRGB(0, y, w, 1, row, 0, w);
      int o = y * pitch;
      for (int x = 0; x < w; x++, o += ps) {
        int p = row[x], r = (p >> 16) & 255, g = (p >> 8) & 255, b = p & 255;
        switch (pixelFormat) {
          case TJ.PF_GRAY: dstBuf[o] = (byte) ((r * 77 + g * 150 + b * 29) >> 8); break;
          case TJ.PF_BGR: dstBuf[o] = (byte) b; dstBuf[o + 1] = (byte) g; dstBuf[o + 2] = (byte) r; break;
          case TJ.PF_BGRX: dstBuf[o] = (byte) b; dstBuf[o + 1] = (byte) g; dstBuf[o + 2] = (byte) r; dstBuf[o + 3] = (byte) 255; break;
          case TJ.PF_XBGR: dstBuf[o] = (byte) 255; dstBuf[o + 1] = (byte) b; dstBuf[o + 2] = (byte) g; dstBuf[o + 3] = (byte) r; break;
          case TJ.PF_XRGB: dstBuf[o] = (byte) 255; dstBuf[o + 1] = (byte) r; dstBuf[o + 2] = (byte) g; dstBuf[o + 3] = (byte) b; break;
          case TJ.PF_RGBX: dstBuf[o] = (byte) r; dstBuf[o + 1] = (byte) g; dstBuf[o + 2] = (byte) b; dstBuf[o + 3] = (byte) 255; break;
          default: dstBuf[o] = (byte) r; dstBuf[o + 1] = (byte) g; dstBuf[o + 2] = (byte) b;
        }
      }
    }
  }

  public byte[] decompress(int desiredWidth, int pitch, int desiredHeight, int pixelFormat, int flags) throws Exception {
    BufferedImage im = image();
    int ps = TJ.getPixelSize(pixelFormat);
    int w = desiredWidth > 0 ? desiredWidth : im.getWidth();
    int h = desiredHeight > 0 ? desiredHeight : im.getHeight();
    if (pitch <= 0) pitch = w * ps;
    byte[] buf = new byte[pitch * h];
    decompress(buf, desiredWidth, pitch, desiredHeight, pixelFormat, flags);
    return buf;
  }

  public void close() throws Exception { img = null; jpeg = null; }
}
