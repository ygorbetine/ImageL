package org.libjpegturbo.turbojpeg;

/** ImageL: substituto em Java puro do TurboJPEG (o CheerpJ nao carrega bibliotecas nativas). So o que o Bio-Formats usa. */
public final class TJ {
  public static final int PF_RGB = 0, PF_BGR = 1, PF_RGBX = 2, PF_BGRX = 3, PF_XBGR = 4, PF_XRGB = 5, PF_GRAY = 6;
  private static final int[] PIXEL_SIZE = { 3, 3, 4, 4, 4, 4, 1, 4, 4, 4, 4 };

  private TJ() {}

  public static int getPixelSize(int pixelFormat) throws Exception {
    if (pixelFormat < 0 || pixelFormat >= PIXEL_SIZE.length) throw new Exception("Invalid pixel format");
    return PIXEL_SIZE[pixelFormat];
  }
}
