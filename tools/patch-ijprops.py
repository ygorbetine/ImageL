"""Troca http://imagej.net por https://imagej.net no IJ_Props.txt do ij.jar (Open Samples).
O servidor responde ao http com um redirecionamento 301 sem cabecalho CORS, que o navegador bloqueia; o https tem CORS aberto.
Idempotente. Uso: python tools/patch-ijprops.py
"""
import os
import shutil
import tempfile
import zipfile

JAR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lib", "ImageJ", "ij.jar")


def main():
    tmp = tempfile.mktemp(suffix=".jar")
    changed = False
    with zipfile.ZipFile(JAR) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "IJ_Props.txt":
                new = data.replace(b"http://imagej.net/", b"https://imagej.net/")
                changed = new != data
                data = new
            zout.writestr(item, data)
    if changed:
        shutil.move(tmp, JAR)
        print("IJ_Props.txt: imagej.net agora via https")
    else:
        os.remove(tmp)
        print("IJ_Props.txt: nada a fazer")


if __name__ == "__main__":
    main()
