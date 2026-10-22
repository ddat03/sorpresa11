# ¡Feliz cumpleaños, Emma!

Página de regalo de una sola experiencia: bóveda con clave, número "11" de partículas
con fuegos artificiales, carta con fotos, línea de tiempo de bebé a hoy, pantalla de
videos, ruleta 3D de fotos y galería. HTML + CSS + JavaScript plano, sin backend.
Todo el contenido vive en `data/*.json`.

## Editar

| Archivo | Qué controla |
|---|---|
| `data/config.json` | Nombre, textos, **clave de la bóveda** (`boveda.codigo`), **fecha de nacimiento** (`fechaNacimiento`, activa el contador de años/meses/días), música. |
| `data/carta.json` | La carta: párrafos, fotos tipo polaroid, tarjetas "Recuerda siempre que…" y firma. |
| `data/momentos.json` | Línea de tiempo (orden, etiqueta de edad, título, foto, nota). |
| `data/videos.json` | Videos de la pantalla de cine. |
| `data/galeria.json` | Galería completa; las fotos con `"ruleta": true` van en la ruleta 3D. |

## Ver en local

`python -m http.server 8080` → `http://localhost:8080`

## Créditos

Música: "Happy Birthday to You", versión instrumental de dominio público (Wikimedia Commons).
Portada 3D: Three.js.

_Creado por Diego Aleman._
