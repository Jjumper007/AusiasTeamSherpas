# SPEC — Sherpas: "Haz que el plan cobre vida"

Hackathon de 24 h · equipo de 3 personas. Producto y código **en inglés**; este documento está en castellano para el equipo.

## 1. Producto

Un **vídeo MP4 personalizado por cada adulto** de la familia, que explica su plan financiero de Sherpas. Está pensado para familias que **no verán a un asesor**: el plan tiene que funcionar solo, sin que nadie lo explique.

Se ve dentro de la web de Sherpas, que en producción tendría login. En el prototipo hay un **selector de caso y miembro** en su lugar. La página muestra:

1. El vídeo (16:9).
2. Debajo, **capítulos** sincronizados con el vídeo: al hacer clic se salta a ese momento, y el capítulo activo se resalta mientras se reproduce.
3. Una tarjeta **"Your first step"** con la acción principal de `top_moves`, adaptada a la persona (ver §3).

Qué cubre cada criterio del jurado:

| Criterio | Cómo lo cubrimos |
|---|---|
| Engancha | Gancho personal en ≤8 s y metáfora visual de la ruta de montaña |
| Se entiende | El nivel técnico se elige en la encuesta y cambia la parte central del vídeo |
| Es para ellos | Un vídeo por persona: misma familia, distinto foco, tono y llamada a la acción |
| Mueve a actuar | Tarjeta de primer paso según el estilo de decisión de cada persona |
| Días después | En el pitch: vídeos de seguimiento del día 3 y del día 30 generados con el mismo motor (no se construyen) |

## 2. Datos de entrada (`cases/`)

4 casos: `daniel-emily-johnson`, `michael-carter`, `samantha-lewis` (no tiene `report.pdf`) y `timothy-melanie-weah`.

| Archivo | Contenido relevante |
|---|---|
| `financial-health.json` (~100 KB) | `case.household` (nombres, edades, rol, `risk_profile`), `score.published_score` / `band` / `pillars` / `top_moves` (con `score_before` → `score_after`), `goals`, `narrative.*` (textos en inglés llano), `key_metrics`, `projections.yearly` (50 años) |
| `investment-analysis.json` (~120 KB) | `narrative.*`, `positions`, `key_metrics`, `analysis` |
| `persona.md` | Clasificación D0–D6 (D5 = estilo de decisión, D6 = motivación), preocupaciones O1–O8, tensiones T1–T5 y el bloque ```` ```classification ```` |
| `report.pdf` | Report visual; solo como referencia, el pipeline no lo usa |

**Para el pitch:** en los 4 casos, "Subjective concerns" está vacío. La encuesta rellena justo ese hueco.

## 3. Encuesta (la rellena el cliente antes de generar el vídeo)

1. **Nickname**: se usa en la narración.
2. **How should I explain it?**: `simple` (Keep it simple) · `straight` (Straight talk) · `nerd` (Nerd mode).
3. **What's on your mind most?**: las opciones se **generan a partir de los objetivos y preocupaciones del caso** (jubilación, universidad, colchón de emergencia, deuda, proteger a la familia...), en lenguaje llano. Si se elige algo que el plan no cubre, **se omite** y el vídeo se centra en lo demás.
4. **When you make a big money decision, you…**: `just_do_it` · `research_first` · `ask_trusted` · `wait`.

La respuesta 4 decide la llamada a la acción y **tiene prioridad sobre D5** de `persona.md`:

| Respuesta | Llamada a la acción en la tarjeta y al final del vídeo |
|---|---|
| `just_do_it` | Un único botón grande y "takes 10 minutes" |
| `research_first` | Sección para ampliar ("why this number?") y enlaces a más información |
| `ask_trusted` | Botón "Send this to [pareja]" / "to someone you trust" |
| `wait` | Lo que cuesta esperar (datos de `projections.yearly`) y un recordatorio |

La encuesta está abierta a añadir preguntas más adelante. Los hijos no tienen vídeo propio, pero aparecen en la historia de sus padres.

## 4. Vídeo

- **Formato:** 1920×1080, 30 fps, **60–90 s** (el validador acepta hasta 120 s).
- **Audio:** narración en inglés con ElevenLabs, siempre la **misma voz de marca**, y música de fondo fija.
- **Subtítulos:** se generan con los tiempos por carácter que devuelve ElevenLabs (`/with-timestamps`).
- **Metáfora visual, el plan como ruta de montaña:**
  - la puntuación es la **altitud** a la que está la familia;
  - cada `top_move` es un **tramo de la ruta** (52 → 57 → 60);
  - lo que falta (seguro, colchón...) es **el equipo que falta en la mochila**;
  - la jubilación es **la cima**;
  - el primer paso es **el siguiente paso en el sendero**.
- **Estilo:** ilustración plana y cálida, no gráficos de banco. Los datos aparecen dentro de la metáfora (altímetro, mapa con fechas).
- **Arco fijo de 5 partes.** Claude rellena y anima cada parte, pero no cambia el orden:
  1. **Gancho personal** (≤8 s): apodo, familia y lo que dijo que le preocupa.
  2. **Dónde estás**: la puntuación explicada como altitud.
  3. **Lo que más importa**: 1–2 preocupaciones conectadas con la respuesta de la encuesta. **Aquí cambia la profundidad técnica según el perfil**: sin tecnicismos en `simple`, con tablas y cifras detalladas superpuestas en `nerd`.
  4. **Tu primer paso**: una sola acción.
  5. **Qué cambia si lo das**: `score_before` → `score_after` y algo tangible.

## 5. Pipeline (lo dirige Express)

```
survey + case ─▶ [1] brief + facts.ts ─▶ [2] script (claude -p) ─▶ [3] TTS (ElevenLabs)
             ─▶ [4] TSX (claude -p, en entorno aislado) ─▶ [5] validadores ─▶ [6] reintentos / respaldo ─▶ [7] render MP4
```

1. **Brief** (Node, determinista). Convierte el JSON, `persona.md` y la encuesta en un **brief de unos 8 KB**: familia, puntuación y sus 5 áreas, `top_moves`, objetivos, `narrative.*`, clasificación y encuesta. Genera también **`facts.ts`** con constantes con nombre (`SCORE_NOW = 52`, `RETIREMENT_GAP = 1427456`...). Claude puede leer los JSON completos si necesita algo concreto.
2. **Guion** (`claude -p`, prompt en `prompts/script.md`). Devuelve un JSON validado con zod; si no cumple el esquema, se reintenta con el error:
   - `scenes[5]`: `{ part, narration, visualIdea, factsUsed[] }`
   - `chapters[5]`: `{ title, body }`, 2–3 frases al nivel elegido
   - `cta`: `{ type, text }`
3. **TTS.** Un audio por escena con ElevenLabs `/with-timestamps`, con **caché por hash del texto**. Se miden las duraciones.
4. **TSX** (`claude -p`, prompt en `prompts/scenes.md`):
   - Trabaja en una **copia aislada** de `video-template/` dentro de `runs/.../`, con las duraciones de escena ya fijadas.
   - **Editable:** los componentes base (Claude puede modificarlos y crear nuevos).
   - **Bloqueado:** design tokens (paleta, tipografías, márgenes seguros), `Root.tsx`, capa de audio y subtítulos, música y voz.
   - Herramientas permitidas: `--allowedTools "Read,Write,Edit,Bash(npx tsc*)"`, con `cwd` dentro del entorno aislado.
5. **Validadores** (Express, deterministas):
   1. `tsc --noEmit` sin errores.
   2. `npx remotion still` en 5 fotogramas sin excepciones.
   3. Duración entre 60 y 120 s.
   4. **Cifras:** ningún número de más de 2 dígitos en el TSX o en la narración que no salga de `facts.ts`. Los redondeos solo a través del helper `fmt` (por ejemplo, `fmt.round(RETIREMENT_GAP)` → "$1.4M").
   5. **Revisión visual** (`prompts/visual-review.md`): Claude mira los fotogramas como imágenes para detectar texto cortado, elementos solapados o contraste ilegible, y los corrige.
6. **Reintentos:** hasta 3, pasando a Claude los errores. Si siguen fallando, se usa la **composición fija de respaldo** con los datos del caso, de modo que **siempre sale un MP4**.
7. **Render** del MP4 final.

**Infraestructura:**
- Trabajos en un `Map` en memoria. `POST /jobs` devuelve el id del trabajo y la generación sigue en segundo plano.
- Progreso por **SSE** (`GET /jobs/:id/events`) a medida que avanzan los pasos.
- Resultados en `runs/<caseId>/<member>/<timestamp>/`: `survey.json`, brief, guion, audio, TSX, logs y MP4.
- Sin base de datos.

## 6. Repositorio

Monorepo con npm workspaces, TypeScript en todo:

```
backend/          Express: jobs, SSE, pipeline, validadores, ElevenLabs, claude -p
frontend/         Vite + React: selector, encuesta, reproductor + capítulos + tarjeta
video-template/   Remotion: tokens bloqueados, componentes, composición de respaldo
prompts/          script.md, scenes.md, visual-review.md (con marcadores)
cases/            datos del reto
runs/             salidas (.gitignore)
```

- La key `ELEVENLABS_API_KEY` va en `.env`; se versiona `.env.example`.
- **Tests unitarios solo en piezas deterministas:** extractor del brief, generador de `facts.ts`, validador de cifras, correspondencia entre estilo de decisión y llamada a la acción, y esquemas zod. Sin E2E y sin cobertura mínima en la interfaz.
- "I did it" y "Remind me" guardan el estado en `localStorage` y muestran un aviso simulado ("We'll nudge you on day 3").

## 7. Demo

- **Caso principal: Daniel & Emily**, con los vídeos **ya renderizados y descargados**:
  - **Daniel:** `nerd` · retirement · `research_first` → vídeo denso en datos, con sección para ampliar.
  - **Emily:** `simple` · protecting the kids · `ask_trusted` → vídeo cálido, con botón "Send this to Daniel".
- Vídeos de respaldo renderizados para los otros 4 adultos.
- La generación en directo (3–8 min) es opcional; se puede enseñar el progreso por SSE.
- Las diapositivas incluyen el seguimiento del día 3 y del día 30.

## 8. Equipo e hitos

| Rol | Responsabilidad |
|---|---|
| **A – Pipeline** | `backend/`: brief, `facts.ts`, `claude -p`, validadores, ElevenLabs, jobs y SSE |
| **B – Vídeo** | `video-template/`: tokens, componentes, audio y subtítulos, composición de respaldo |
| **C – Producto y prompts** | `frontend/`, `prompts/`, calidad del contenido, pitch |

Los tres se conectan a través de dos formatos de datos que se acuerdan en H+1: el **esquema del brief** y el **esquema del guion**.

| Hora | Hito |
|---|---|
| H+1 | Esquemas del brief y del guion congelados; repositorio montado |
| H+6 | **Flujo completo** (feo): selector → encuesta → brief → guion → voz → vídeo de respaldo → reproductor |
| H+12 | Generación de TSX con Claude, validadores y bucle de reintentos |
| H+16 | Revisión visual, capítulos sincronizados, tarjeta según el estilo de decisión |
| H+18 | **Funcionalidades congeladas.** Renderizar y descargar los vídeos de la demo y los respaldos |
| H+18–24 | Pulir prompts y diseño, ensayar el pitch, preparar diapositivas |

**Recortes si vamos tarde (en este orden):** primero la revisión visual, después la variante `research_first`.
