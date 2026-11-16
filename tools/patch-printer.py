"""File > Print... trava a JVM no CheerpJ (PrinterJob.printDialog). Este patch compila ij.plugin.filter.Printor (so mostra um aviso)
e aponta o comando "Print..." para ela, trocando no ij/Menus.class a string de mesmo tamanho. Idempotente.
Uso: python tools/patch-printer.py  (requer JDK em JAVA_HOME)
"""
import os
import shutil
import subprocess
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JAR = os.path.join(ROOT, "lib", "ImageJ", "ij.jar")
SRC = os.path.join(ROOT, "printor-patch", "ij", "plugin", "filter", "Printor.java")
OLD = b'ij.plugin.filter.Printer("print")'
NEW = b'ij.plugin.filter.Printor("print")'


def main():
    with zipfile.ZipFile(JAR) as z:
        menus = z.read("ij/Menus.class")
    if NEW in menus:
        print("Printor: nada a fazer")
        return
    assert OLD in menus and len(OLD) == len(NEW)
    home = os.environ.get("JAVA_HOME")
    javac = os.path.join(home, "bin", "javac.exe" if os.name == "nt" else "javac") if home else "javac"
    out = tempfile.mkdtemp()
    subprocess.check_call([javac, "--release", "8", "-encoding", "UTF-8", "-cp", JAR, "-d", out, SRC])
    cls = open(os.path.join(out, "ij", "plugin", "filter", "Printor.class"), "rb").read()
    tmp = tempfile.mktemp(suffix=".jar")
    with zipfile.ZipFile(JAR) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "ij/Menus.class":
                data = data.replace(OLD, NEW)
            zout.writestr(item, data)
        zout.writestr("ij/plugin/filter/Printor.class", cls)
    shutil.move(tmp, JAR)
    shutil.rmtree(out, ignore_errors=True)
    print("Printor: File > Print... agora so avisa")


if __name__ == "__main__":
    main()
