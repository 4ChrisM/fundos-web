"""Portada en video de Fundos Puerto Varas: bucle sin texto armado con tramos de los videos del cliente.

Uso: python3 tools/portada_puerto_varas.py <carpeta con los originales>
Los originales (tomas de dron con título) no están en main: se sacan del historial de la rama de trabajo
(git show <commit>:<ruta>). Los tramos elegidos evitan los títulos; el final se funde con el inicio.
Salida: assets/video/puerto-varas(.mp4|.webm|.webp) y puerto-varas-movil (vertical 540x960).
"""
import subprocess, imageio_ffmpeg, os, sys
FF = imageio_ffmpeg.get_ffmpeg_exe()
SEG = [("LAGO_LLANQUIHUE_FINAL.mp4", 3.6, 5.6), ("Convert_sample_FRUTILLAR.mp4", 2.3, 5.4), ("SALTOS_DE_PETROHUE.mp4", 2.1, 3.9),
       ("VOLCAN_OSORNO_FINAL.mp4", 4.1, 5.4), ("PUERTO_VARAS.mp4", 2.7, 4.7), ("PUERTO_VARAS.mp4", 5.0, 6.2)]
X = 0.45  # fundido
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "video") + os.sep
os.chdir(sys.argv[1] if len(sys.argv) > 1 else ".")
def build(w, h, crop, name, crf_x, crf_v):
    args = [FF, "-v", "error", "-y"]
    for f, a, b in SEG: args += ["-ss", str(a), "-t", str(b - a), "-i", f]
    fl = []
    for i, _ in enumerate(SEG):
        c = crop or ""
        fl.append("[%d:v]fps=30,%sscale=%d:%d:flags=lanczos,setsar=1,format=yuv420p,settb=AVTB[v%d]" % (i, c, w, h, i))
    acc, t = "v0", SEG[0][2] - SEG[0][1]
    for i in range(1, len(SEG)):
        off = t - X
        fl.append("[%s][v%d]xfade=transition=fade:duration=%g:offset=%g[x%d]" % (acc, i, X, off, i))
        acc = "x%d" % i; t = off + (SEG[i][2] - SEG[i][1])
    # el final se funde con el inicio: el bucle no salta
    fl.append("[%s]split[a][b];[b]trim=0:%g,setpts=PTS-STARTPTS,fps=30[head];[a]trim=%g,setpts=PTS-STARTPTS,fps=30[rest];[rest][head]xfade=transition=fade:duration=%g:offset=%g,eq=saturation=1.05:contrast=1.02,format=yuv420p[out]" % (acc, X, X, X, t - 2 * X))
    flt = ";".join(fl)
    base = args + ["-filter_complex", flt, "-map", "[out]", "-an"]
    subprocess.run(base + ["-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", str(crf_x), "-maxrate", "2600k", "-bufsize", "5200k", "-movflags", "+faststart", OUT + name + ".mp4"], check=True)
    subprocess.run(base + ["-c:v", "libvpx-vp9", "-crf", str(crf_v), "-b:v", "2200k", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", OUT + name + ".webm"], check=True)
    subprocess.run([FF, "-v", "error", "-y", "-ss", "2.4", "-i", OUT + name + ".mp4", "-frames:v", "1", OUT + name + "-poster.png"], check=True)
    from PIL import Image
    Image.open(OUT + name + "-poster.png").save(OUT + name + ".webp", "WEBP", quality=72, method=6); os.remove(OUT + name + "-poster.png")
    for e in ("mp4", "webm", "webp"): print(name, e, os.path.getsize(OUT + name + "." + e) // 1024, "KB")
    print("dur", round(t - X, 2))
build(1600, 900, None, "puerto-varas", 26, 38)
build(540, 960, "crop=ih*9/16:ih,", "puerto-varas-movil", 27, 38)
