"""Aplica bioformats-patch/ ao bioformats_package.jar: troca a parte nativa do TurboJPEG por Java puro (o CheerpJ nao
carrega JNI) e remove as bibliotecas nativas embutidas.

Uso: python tools/patch-bioformats.py   (requer JDK 9+ em JAVA_HOME ou no PATH)
"""
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JAR = os.path.join(ROOT, "lib", "ImageJ", "plugins", "bioformats_package.jar")
SRC = os.path.join(ROOT, "bioformats-patch", "src")
MARK = "META-INF/imagel-patch.txt"


def javac():
    home = os.environ.get("JAVA_HOME")
    exe = "javac.exe" if os.name == "nt" else "javac"
    return os.path.join(home, "bin", exe) if home else "javac"


def main():
    out = tempfile.mkdtemp()
    srcs = [os.path.join(d, f) for d, _, fs in os.walk(SRC) for f in fs if f.endswith(".java")]
    subprocess.check_call([javac(), "--release", "8", "-nowarn", "-cp", JAR, "-d", out] + srcs)
    new = {}
    for d, _, fs in os.walk(out):
        for f in fs:
            p = os.path.join(d, f)
            with open(p, "rb") as fh:
                new[os.path.relpath(p, out).replace(os.sep, "/")] = fh.read()
    tmp = JAR + ".tmp"
    with zipfile.ZipFile(JAR) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for it in zin.infolist():
            n = it.filename
            if n in new or n == MARK or (n.startswith("META-INF/lib/") and not n.endswith("/")):
                continue  # substituidas / bibliotecas nativas (inuteis no CheerpJ)
            zout.writestr(it, zin.read(n))
        for n, data in sorted(new.items()):
            zout.writestr(n, data)
        zout.writestr(MARK, "ImageL: TurboJPEG em Java puro (bioformats-patch/). Classes: " + ", ".join(sorted(new)) + "\n")
    os.replace(tmp, JAR)
    shutil.rmtree(out, ignore_errors=True)
    print("ok:", len(new), "classes;", os.path.getsize(JAR), "bytes")


if __name__ == "__main__":
    sys.exit(main())
