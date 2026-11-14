package org.scijava.nativelib;

/**
 * ImageL: no CheerpJ nao ha bibliotecas nativas. "turbojpeg" e atendido pelas classes Java puro de org.libjpegturbo
 * (ver bioformats-patch/README.md); qualquer outra biblioteca continua indisponivel, como antes.
 */
public class NativeLibraryUtil {
  public static final String DELIM = "/";
  public static final String DEFAULT_SEARCH_PATH = "natives" + DELIM;

  public NativeLibraryUtil() {}

  public static String getPlatformLibraryPath(String searchPath) { return searchPath; }

  public static String getPlatformLibraryName(String libName) { return libName; }

  public static String getVersionedLibraryName(Class<?> libraryJarClass, String libName) { return libName; }

  public static boolean loadVersionedNativeLibrary(Class<?> libraryJarClass, String libName) { return loadNativeLibrary(libraryJarClass, libName); }

  public static boolean loadNativeLibrary(JniExtractor jniExtractor, String libName, String... searchPaths) { return "turbojpeg".equals(libName); }

  public static boolean loadNativeLibrary(Class<?> libraryJarClass, String libName) { return "turbojpeg".equals(libName); }
}
