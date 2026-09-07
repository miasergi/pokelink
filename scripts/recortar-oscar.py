# -*- coding: utf-8 -*-
"""Recorta el fondo de las fotos de Óscar y las deja listas para la web.

Por qué en Python y fuera del build: el recortador que ya tiene el repo
(`scripts/png-cutout.mjs`) hace flood fill desde los bordes, que va de lujo con
capturas de juego de fondo plano y se atraganta con una foto en un bar. Para
fotos de verdad hace falta segmentación, y eso son 400 MB de modelo que NO
queremos como dependencia del proyecto. Esto se ejecuta a mano una vez y al
repo solo entran los PNG resultantes.

    python -m pip install rembg onnxruntime pillow
    python scripts/recortar-oscar.py

Entra:  fotos-oscar/*.jpeg
Sale:   public/despedida/oscar/<nombre>.webp (recortado, sin fondo, a 560 px)
"""
import io
import os
import sys

from PIL import Image
from rembg import new_session, remove

ORIGEN = 'fotos-oscar'
DESTINO = os.path.join('public', 'despedida', 'oscar')
# Los stickers se pintan a 300 px como mucho, así que 900 era tirar bytes al
# móvil de todos. Y WebP con alfa pesa una fracción de lo que pesa el PNG.
ANCHO_MAX = 560

# Qué foto es cuál y cómo hay que tratarla. `recorte` limita la zona útil ANTES
# de segmentar, en fracciones (izq, arriba, der, abajo): sirve para quedarse
# solo con Óscar en las fotos donde sale acompañado.
# `modo` decide cómo se trata cada una:
#   'recorte' → segmentación (rembg). Para fotos con fondo separable.
#   'redondo' → NADA de segmentación, solo recorte cuadrado. Para los primeros
#               planos que llenan el encuadre: ahí el modelo se lía intentando
#               separar una cara de una pared que está a dos centímetros, y un
#               círculo bien cortado queda mejor que un recorte con agujeros.
FOTOS = [
    # id            fichero                                          recorte                       modo
    ('morros',      'WhatsApp Image 2026-09-04 at 14.32.11 (6).jpeg', (0.02, 0.00, 0.98, 0.72), 'redondo'),
    ('resignado',   'WhatsApp Image 2026-09-04 at 14.32.11 (4).jpeg', (0.02, 0.00, 0.74, 1.00), 'recorte'),
    ('facepalm',    'WhatsApp Image 2026-09-04 at 14.32.12.jpeg',     (0.20, 0.00, 0.80, 0.40), 'recorte'),
    ('onepiece',    'WhatsApp Image 2026-09-04 at 14.32.12 (1).jpeg', (0.00, 0.10, 0.62, 0.75), 'recorte'),
    ('paseando',    'WhatsApp Image 2026-09-04 at 14.32.11 (5).jpeg', None,                     'recorte'),
    ('mascarilla',  'WhatsApp Image 2026-09-04 at 14.32.10 (1).jpeg', (0.38, 0.10, 0.90, 0.85), 'recorte'),
    ('jersey',      'WhatsApp Image 2026-09-04 at 14.32.10.jpeg',     (0.00, 0.08, 0.50, 1.00), 'recorte'),
    ('maria',       'WhatsApp Image 2026-09-04 at 14.32.11 (3).jpeg', None,                     'recorte'),
    ('pulgar',      'WhatsApp Image 2026-09-04 at 14.32.11 (1).jpeg', (0.10, 0.25, 0.65, 1.00), 'recorte'),
]


def recortar(img: Image.Image, caja) -> Image.Image:
    if not caja:
        return img
    w, h = img.size
    i, a, d, b = caja
    return img.crop((int(w * i), int(h * a), int(w * d), int(h * b)))


def main() -> int:
    if not os.path.isdir(ORIGEN):
        print(f'No encuentro la carpeta {ORIGEN}', file=sys.stderr)
        return 1
    os.makedirs(DESTINO, exist_ok=True)

    # Una sola sesión: cargar el modelo en cada foto multiplica el tiempo por 9.
    sesion = new_session('u2net')

    for nombre, fichero, caja, modo in FOTOS:
        ruta = os.path.join(ORIGEN, fichero)
        if not os.path.exists(ruta):
            print(f'  · falta {fichero}, la salto')
            continue

        original = recortar(Image.open(ruta).convert('RGB'), caja)

        if modo == 'redondo':
            # Cuadrado centrado; la máscara circular la pone el CSS.
            lado = min(original.size)
            i = (original.width - lado) // 2
            a = (original.height - lado) // 2
            sin_fondo = original.crop((i, a, i + lado, a + lado)).convert('RGBA')
        else:
            sin_fondo = remove(original, session=sesion)
            # El recorte útil es la caja del alfa: sin esto quedan márgenes
            # transparentes enormes que luego descuadran el sticker en la web.
            caja_alfa = sin_fondo.getchannel('A').getbbox()
            if caja_alfa:
                sin_fondo = sin_fondo.crop(caja_alfa)

        if sin_fondo.width > ANCHO_MAX:
            alto = round(sin_fondo.height * ANCHO_MAX / sin_fondo.width)
            sin_fondo = sin_fondo.resize((ANCHO_MAX, alto), Image.LANCZOS)

        salida = os.path.join(DESTINO, f'{nombre}.webp')
        buf = io.BytesIO()
        sin_fondo.save(buf, 'WEBP', quality=82, method=6)
        with open(salida, 'wb') as f:
            f.write(buf.getvalue())
        print(f'  - {nombre}.webp  {sin_fondo.width}x{sin_fondo.height}  {len(buf.getvalue()) // 1024} KB')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
