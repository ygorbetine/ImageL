"""Acrescenta ao jar do DeepImageJ JS a classe com.leaningtech.client.Global (deepimagej-patch/), que troca o
NoClassDefFoundError por um aviso claro. Uso: python tools/patch-deepimagej.py  (requer JDK 9+ em JAVA_HOME ou no PATH)
"""
import glob
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGINS = os.path.join(ROOT, "lib", "ImageJ", "plugins")
IJ = os.path.join(ROOT, "lib", "ImageJ", "ij.jar")
SRC = os.path.join(ROOT, "deepimagej-patch", "src")


def javac():
    home = os.environ.get("JAVA_HOME")
    exe = "javac.exe" if os.name == "nt" else "javac"
    return os.path.join(home, "bin", exe) if home else "javac"


def main():
    jars = glob.glob(os.path.join(PLUGINS, "DeepImageJ_JS_*.jar"))
    if not jars:
        print("jar do DeepImageJ nao encontrado")
        return 1
    jar = jars[0]
    out = tempfile.mkdtemp()
    srcs = [os.path.join(d, f) for d, _, fs in os.walk(SRC) for f in fs if f.endswith(".java")]
    subprocess.check_call([javac(), "--release", "8", "-nowarn", "-cp", IJ, "-d", out] + srcs)
    new = {}
    for d, _, fs in os.walk(out):
        for f in fs:
            p = os.path.join(d, f)
            with open(p, "rb") as fh:
                new[os.path.relpath(p, out).replace(os.sep, "/")] = fh.read()
    tmp = jar + ".tmp"
    with zipfile.ZipFile(jar) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for it in zin.infolist():
            if it.filename not in new:
                zout.writestr(it, zin.read(it.filename))
        for n, data in sorted(new.items()):
            zout.writestr(n, data)
    os.replace(tmp, jar)
    shutil.rmtree(out, ignore_errors=True)
    print("ok:", ", ".join(sorted(new)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
