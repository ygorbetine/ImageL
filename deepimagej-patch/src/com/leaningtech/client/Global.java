package com.leaningtech.client;

import deepimagej.Promise;
import ij.ImagePlus;
import ij.ImageStack;
import ij.process.FloatProcessor;
import ij.process.ImageProcessor;

/**
 * ImageL: ponte do DeepImageJ JS para o executor de modelos do ImageL (src/ai/dij-runner.js, TensorFlow.js).
 *
 * O plugin foi escrito para o CheerpJ antigo + ImJoy: chama Global.jsCall("callPlugin", "ImJoyModelRunner", funcao,
 * args..., promise) e fica em lock.wait() ate o promise ser resolvido. Aqui cada chamada roda numa thread propria, que
 * fala com o JavaScript por metodos nativos (registrados em threadhack/runtime/loader.js) e depois resolve o promise.
 */
public final class Global {
  private Global() {}

  /** Texto de volta do JavaScript; erros chegam com este prefixo. */
  private static final String ERR = "!ERR ";

  private static native String nativeText(String function, String arg);

  /** Entrada e saida em ordem HWC (float32). Saida: [largura, altura, canais, dados...]; vazia em caso de erro. */
  private static native float[] nativePredict(String model, float[] data, int width, int height, int channels);

  /**
   * As chamadas em que o plugin fica em lock.wait() (getModels, getFile, runIJMacro, predict) sao feitas aqui mesmo, na
   * thread do plugin: quando jsCall retorna o trabalho ja terminou, entao nao ha corrida entre o plugin e a macro ou o
   * modelo. Depois disso a trava e notificada algumas vezes so para liberar o wait(). initModel nao tem wait (vem do
   * evento de selecao no dialogo) e roda numa thread propria para nao congelar a interface enquanto baixa os pesos.
   */
  /** Numero da chamada mais recente: notificacoes atrasadas de chamadas antigas nao podem acordar o wait() das novas. */
  private static volatile int generation;

  public static Object jsCall(final String function, final Object... args) {
    generation++;
    final Thread caller = Thread.currentThread();
    String func = args.length > 1 ? String.valueOf(args[1]) : "";
    if (func.equals("initModel")) {
      Thread t = new Thread(new Runnable() {
        public void run() { dispatch(args, caller); }
      }, "ImageL-DeepImageJ");
      t.start();
    } else {
      dispatch(args, caller);
    }
    return null;
  }

  private static void dispatch(Object[] a, Thread caller) {
    Promise p = a.length > 0 && a[a.length - 1] instanceof Promise ? (Promise) a[a.length - 1] : null;
    try {
      String func = a.length > 1 ? String.valueOf(a[1]) : "";
      if (func.equals("predict")) {
        final ImagePlus out = predict(String.valueOf(a[2]), (ImagePlus) a[3]);
        final Promise pp = p;
        if (p != null) deliver(p, new Runnable() { public void run() { pp.resolveImagePlus(out); } });
        return;
      }
      String result;
      if (func.equals("runIJMacro")) {
        ij.IJ.runMacro(String.valueOf(a[2]));
        // O plugin fixou a imagem de entrada como "imagem atual" da thread dele; a macro costuma fecha-la e deixar outra
        // no lugar. Sem limpar isso ele seguiria com a imagem fechada (NullPointerException no espelhamento).
        ij.WindowManager.setTempCurrentImage(caller, null);
        ij.WindowManager.setTempCurrentImage(null);
        settle();
        result = "";
      } else {
        result = nativeText(func, a.length > 3 ? String.valueOf(a[2]) : "");
        if (result != null && result.startsWith(ERR)) throw new RuntimeException(result.substring(ERR.length()));
      }
      final String res = result;
      final Promise pp = p;
      if (p != null) deliver(p, new Runnable() { public void run() { pp.resolveString(res); } });
    } catch (Throwable e) {
      System.out.println("[ImageL DeepImageJ] erro: " + e);
      final String msg = e.getMessage() != null ? e.getMessage() : e.toString();
      final Promise pp = p;
      if (p != null) deliver(p, new Runnable() { public void run() { pp.reject(msg); } }); else ij.IJ.log("DeepImageJ: " + msg);
    }
  }

  /**
   * A macro abre/fecha janelas (ex.: B&C, que tem thread propria); no CheerpJ as threads sao cooperativas, entao deixa a
   * fila de eventos e as outras threads terminarem antes de o plugin continuar. Sem isso a 2a execucao na mesma sessao
   * terminava logo depois de "Processing patch" (corrida dependente de tempo).
   */
  private static void settle() {
    try {
      if (!java.awt.EventQueue.isDispatchThread()) java.awt.EventQueue.invokeAndWait(new Runnable() { public void run() {} });
      Thread.sleep(150);
    } catch (Throwable e) { /* melhor esforco */ }
  }

  /**
   * Os promises do plugin chamam lock.notify() sem "synchronized" (funcionava no CheerpJ antigo). Para o notify valer,
   * depois do callback os objetos-trava da classe que criou o promise sao notificados segurando o monitor.
   */
  private static void deliver(Promise p, final Runnable call) {
    final int gen = generation;
    java.util.List<Object> locks = new java.util.ArrayList<Object>();
    try {
      Class<?> enc = p.getClass().getEnclosingClass();
      Object outer = null;
      for (java.lang.reflect.Field f : p.getClass().getDeclaredFields()) {
        if (f.getName().startsWith("this$")) { f.setAccessible(true); outer = f.get(p); }
      }
      if (enc != null) {
        for (java.lang.reflect.Field f : enc.getDeclaredFields()) {
          if (f.getType() != Object.class) continue;
          f.setAccessible(true);
          boolean st = java.lang.reflect.Modifier.isStatic(f.getModifiers());
          Object v = st ? f.get(null) : (outer != null ? f.get(outer) : null);
          if (v != null) locks.add(v);
        }
      }
    } catch (Throwable e) {
      System.out.println("[ImageL DeepImageJ] locks: " + e);
    }
    // 1) o callback grava o resultado (o notify() dele, sem monitor, nao tem efeito no CheerpJ 4);
    // 2) quem chamou vai entrar em wait() logo depois de jsCall retornar: cada trava e notificada varias vezes, com
    //    intervalos crescentes, ate liberar. O trabalho ja esta pronto, entao acordar cedo ou tarde nao muda o resultado.
    //    As travas sao objetos novos a cada chamada do plugin: notificacoes atrasadas nao atingem chamadas futuras.
    try { call.run(); } catch (Throwable e) { System.out.println("[ImageL DeepImageJ] callback: " + e); }
    for (final Object lock : locks) {
      Thread t = new Thread(new Runnable() {
        public void run() {
          try {
            for (int i = 0; i < 12; i++) {
              Thread.sleep(30L << Math.min(i, 5));
              if (gen != generation) return; // o plugin ja fez outra chamada: esta trava nao e mais dele
              synchronized (lock) { lock.notifyAll(); }
            }
          } catch (InterruptedException e) { /* fim */ }
        }
      }, "ImageL-DeepImageJ-notify");
      t.setDaemon(true);
      t.start();
    }
  }

  private static ImagePlus predict(String model, ImagePlus patch) {
    int w = patch.getWidth(), h = patch.getHeight();
    int c = Math.max(1, patch.getStackSize());
    float[] data = new float[w * h * c];
    ImageStack st = patch.getStack();
    for (int k = 0; k < c; k++) {
      ImageProcessor ip = st.getProcessor(k + 1);
      float[] px = (float[]) ip.convertToFloat().getPixels();
      for (int i = 0, o = k; i < px.length; i++, o += c) data[o] = px[i];
    }
    float[] r = nativePredict(model, data, w, h, c);
    if (r == null || r.length < 3) {
      String why = nativeText("lastError", "");
      throw new RuntimeException(why == null || why.length() == 0 ? "model returned no data" : why);
    }
    int ow = (int) r[0], oh = (int) r[1], oc = (int) r[2];
    if (ow <= 0 || oh <= 0 || oc <= 0 || r.length < 3 + ow * oh * oc) throw new RuntimeException("unexpected output size");
    ImageStack os = new ImageStack(ow, oh);
    for (int k = 0; k < oc; k++) {
      float[] px = new float[ow * oh];
      for (int i = 0, o = 3 + k; i < px.length; i++, o += oc) px[i] = r[o];
      os.addSlice("", new FloatProcessor(ow, oh, px, null));
    }
    ImagePlus out = new ImagePlus("output", os);
    if (oc > 1) out.setDimensions(oc, 1, 1);
    return out;
  }
}
