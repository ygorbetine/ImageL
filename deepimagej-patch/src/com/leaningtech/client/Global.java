package com.leaningtech.client;

/**
 * ImageL: o DeepImageJ JS foi escrito para o CheerpJ antigo e para o ambiente ImJoy (plugin "ImJoyModelRunner"), que
 * nao existem aqui. Sem esta classe o comando terminava em "NoClassDefFoundError: com/leaningtech/client/Global".
 * Agora ele explica o motivo e encerra sem rastro de pilha.
 */
public final class Global {
  private Global() {}

  public static Object jsCall(String function, Object... args) {
    ij.IJ.error("DeepImageJ",
        "DeepImageJ is not available in ImageL yet.\n \n"
        + "This plugin needs the ImJoy model runner (\"ImJoyModelRunner\"),\n"
        + "which is not part of this build.");
    throw new RuntimeException(ij.Macro.MACRO_CANCELED);
  }
}
