package ij.plugin.filter;

import ij.IJ;
import ij.ImagePlus;
import ij.process.ImageProcessor;

/**
 * ImageL: File > Print... Em CheerpJ o PrinterJob.printDialog() trava a JVM inteira; este comando so avisa.
 * (tools/patch-printer.py troca "ij.plugin.filter.Printer(\"print\")" por "ij.plugin.filter.Printor(\"print\")" no ij.Menus.)
 */
public class Printor implements PlugInFilter {
  public int setup(String arg, ImagePlus imp) {
    IJ.showMessage("Print", "Printing is not available in ImageL (the browser engine has no print dialog).\nUse File > Save As and print from another application.");
    return DONE;
  }
  public void run(ImageProcessor ip) {}
}
