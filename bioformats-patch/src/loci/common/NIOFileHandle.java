package loci.common;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.FileChannel;

/**
 * ImageL: substituto do NIOFileHandle do Bio-Formats. O original usa FileChannel (escrita posicional e memory-mapping),
 * que falha no CheerpJ ao gravar (Bio-Formats Exporter). Esta versao tem a mesma API publica, mas le e grava so com
 * RandomAccessFile, com um cache de leitura simples. Ordem de bytes respeitada como no original.
 */
public class NIOFileHandle extends AbstractNIOHandle {
  protected static int defaultBufferSize = 1048576;
  protected static int defaultRWBufferSize = 8192;

  protected RandomAccessFile raf;
  protected long position;
  protected int bufferSize;
  protected boolean isReadWrite;
  protected ByteOrder order = ByteOrder.BIG_ENDIAN;

  private static final int CACHE = 262144;
  private byte[] cache;
  private long cacheStart = -1;
  private int cacheLen;
  private final byte[] tmp = new byte[8];

  public NIOFileHandle(File file, String mode, int bufferSize) throws IOException {
    this.bufferSize = bufferSize;
    validateMode(mode);
    isReadWrite = mode.equals("rw");
    raf = new RandomAccessFile(file, mode);
  }

  public NIOFileHandle(File file, String mode) throws IOException {
    this(file, mode, mode.equals("rw") ? defaultRWBufferSize : defaultBufferSize);
  }

  public NIOFileHandle(String name, String mode) throws IOException {
    this(new File(name), mode);
  }

  public static void setDefaultBufferSize(int size) { defaultBufferSize = size; }

  public static void setDefaultReadWriteBufferSize(int size) { defaultRWBufferSize = size; }

  public RandomAccessFile getRandomAccessFile() { return raf; }

  public FileChannel getFileChannel() { return raf.getChannel(); }

  public int getBufferSize() { return bufferSize; }

  @Override
  public void setLength(long length) throws IOException {
    raf.setLength(length);
    cacheStart = -1;
  }

  // -- IRandomAccess --

  public void close() throws IOException { raf.close(); }

  public long getFilePointer() { return position; }

  public long length() throws IOException { return raf.length(); }

  public ByteOrder getOrder() { return order; }

  public void setOrder(ByteOrder order) { this.order = order; }

  public int read(byte[] b) throws IOException { return read(b, 0, b.length); }

  public int read(byte[] b, int off, int len) throws IOException {
    if (len <= 0) return 0;
    long length = raf.length();
    if (position >= length) return -1;
    if (position + len > length) len = (int) (length - position);
    if (len >= CACHE) {
      raf.seek(position);
      int done = 0;
      while (done < len) {
        int n = raf.read(b, off + done, len - done);
        if (n <= 0) break;
        done += n;
      }
      position += done;
      return done == 0 ? -1 : done;
    }
    int done = 0;
    while (done < len) {
      if (cacheStart < 0 || position < cacheStart || position >= cacheStart + cacheLen) {
        if (cache == null) cache = new byte[CACHE];
        raf.seek(position);
        int n = raf.read(cache, 0, (int) Math.min(CACHE, length - position));
        if (n <= 0) break;
        cacheStart = position;
        cacheLen = n;
      }
      int at = (int) (position - cacheStart);
      int n = Math.min(len - done, cacheLen - at);
      System.arraycopy(cache, at, b, off + done, n);
      done += n;
      position += n;
    }
    return done == 0 ? -1 : done;
  }

  public int read(ByteBuffer buf) throws IOException { return read(buf, 0, buf.capacity()); }

  public int read(ByteBuffer buf, int off, int len) throws IOException {
    if (buf.hasArray()) return read(buf.array(), buf.arrayOffset() + off, len);
    byte[] b = new byte[len];
    int n = read(b, 0, len);
    if (n > 0) {
      ByteBuffer d = buf.duplicate();
      d.position(off);
      d.put(b, 0, n);
    }
    return n;
  }

  public void seek(long pos) throws IOException { position = pos; }

  public boolean readBoolean() throws IOException { return readByte() == 1; }

  public byte readByte() throws IOException {
    readFully(tmp, 0, 1);
    return tmp[0];
  }

  public char readChar() throws IOException { return (char) readShort(); }

  public double readDouble() throws IOException { return Double.longBitsToDouble(readLong()); }

  public float readFloat() throws IOException { return Float.intBitsToFloat(readInt()); }

  public void readFully(byte[] b) throws IOException { readFully(b, 0, b.length); }

  public void readFully(byte[] b, int off, int len) throws IOException {
    int done = 0;
    while (done < len) {
      int n = read(b, off + done, len - done);
      if (n <= 0) throw new EOFException(EOF_ERROR_MSG);
      done += n;
    }
  }

  public int readInt() throws IOException {
    readFully(tmp, 0, 4);
    return ByteBuffer.wrap(tmp, 0, 4).order(order).getInt();
  }

  public String readLine() throws IOException { throw new IOException("Unimplemented"); }

  public long readLong() throws IOException {
    readFully(tmp, 0, 8);
    return ByteBuffer.wrap(tmp, 0, 8).order(order).getLong();
  }

  public short readShort() throws IOException {
    readFully(tmp, 0, 2);
    return ByteBuffer.wrap(tmp, 0, 2).order(order).getShort();
  }

  public int readUnsignedByte() throws IOException { return readByte() & 0xff; }

  public int readUnsignedShort() throws IOException { return readShort() & 0xffff; }

  public String readUTF() throws IOException { return DataInputStream.readUTF(this); }

  public int skipBytes(int n) throws IOException { return (int) skipBytes((long) n); }

  public long skipBytes(long n) throws IOException {
    if (n < 1) return 0;
    long skip = Math.min(n, Math.max(0, raf.length() - position));
    position += skip;
    return skip;
  }

  // -- DataOutput --

  public void write(byte[] b) throws IOException { write(b, 0, b.length); }

  public void write(byte[] b, int off, int len) throws IOException {
    if (len <= 0) return;
    raf.seek(position);
    raf.write(b, off, len);
    position += len;
    cacheStart = -1;
  }

  public void write(ByteBuffer buf) throws IOException { write(buf, 0, buf.capacity()); }

  public void write(ByteBuffer buf, int off, int len) throws IOException {
    if (buf.hasArray()) { write(buf.array(), buf.arrayOffset() + off, len); return; }
    byte[] b = new byte[len];
    ByteBuffer d = buf.duplicate();
    d.position(off);
    d.get(b, 0, len);
    write(b, 0, len);
  }

  public void write(int b) throws IOException { writeByte(b); }

  public void writeBoolean(boolean v) throws IOException { writeByte(v ? 1 : 0); }

  public void writeByte(int v) throws IOException {
    tmp[0] = (byte) v;
    write(tmp, 0, 1);
  }

  public void writeBytes(String s) throws IOException {
    byte[] b = new byte[s.length()];
    for (int i = 0; i < b.length; i++) b[i] = (byte) s.charAt(i);
    write(b, 0, b.length);
  }

  public void writeChar(int v) throws IOException { writeShort(v); }

  public void writeChars(String s) throws IOException {
    ByteBuffer bb = ByteBuffer.allocate(s.length() * 2).order(order);
    for (int i = 0; i < s.length(); i++) bb.putChar(s.charAt(i));
    write(bb.array(), 0, bb.capacity());
  }

  public void writeDouble(double v) throws IOException { writeLong(Double.doubleToLongBits(v)); }

  public void writeFloat(float v) throws IOException { writeInt(Float.floatToIntBits(v)); }

  public void writeInt(int v) throws IOException {
    ByteBuffer.wrap(tmp, 0, 4).order(order).putInt(v);
    write(tmp, 0, 4);
  }

  public void writeLong(long v) throws IOException {
    ByteBuffer.wrap(tmp, 0, 8).order(order).putLong(v);
    write(tmp, 0, 8);
  }

  public void writeShort(int v) throws IOException {
    ByteBuffer.wrap(tmp, 0, 2).order(order).putShort((short) v);
    write(tmp, 0, 2);
  }

  public void writeUTF(String str) throws IOException {
    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    new DataOutputStream(bos).writeUTF(str);
    byte[] b = bos.toByteArray();
    write(b, 0, b.length);
  }
}
