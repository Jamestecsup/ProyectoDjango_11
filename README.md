# Los hooks del agente — useDebounce, usePlans y useAgentRun

Repositorio del laboratorio **extra de la semana 11** de Desarrollo de Aplicaciones Empresariales (DAE).
Continúa la **bandeja de aprobaciones** de la semana 10: un agente de IA propone **planes** (cada uno con su
`plan_hash`) y una persona decide. Ahora la bandeja carga los planes con una petición, busca con retardo y deja que el
agente ejecute lo aprobado. Para eso faltan **tres hooks propios** que escribes tú, contra pruebas. Después revisas
tres hooks «escritos por una IA» que se ven bien, compilan y tienen **seis fallos** típicos.

Todo es **local**: la red es simulada (`src/lib/api.js`, con retardo y un modo que falla) y las decisiones quedan en
el navegador. La conexión real con la API del curso llega en la semana 12.

La guía del laboratorio (con su rúbrica) está en el campus virtual; aquí está el código.

## Puesta en marcha

Necesitas **Node 20.19 o superior** (o Node 22.12 o superior): `node -v`. En PowerShell:

```powershell
npm install
npm run dev        # abre la dirección que imprime (http://localhost:5173); déjalo corriendo
```

En **otra terminal** vas a correr las pruebas. Al empezar, la aplicación se dibuja pero se queda cargando para siempre:
las pruebas fallan a propósito, y tu trabajo es ponerlas en verde.

```powershell
npm test           # tu código (src/hooks): 57 pruebas, 40 fallan al empezar
```

Para ver el modo de fallo de red: abre `http://localhost:5173/?fail=1` o marca «Simular fallo de red» y pulsa
«Recargar planes».

## Las partes del laboratorio

Cada parte tiene un comentario `TODO` en su archivo con lo que debes hacer. Después de cada una:

| Parte | Archivo | Qué escribes | Comando |
|---|---|---|---|
| 1 | `src/hooks/useDebounce.js` | Devuelve el valor solo tras `delay` ms sin cambios; cancela el temporizador anterior y limpia al desmontar | `npm test -- useDebounce` |
| 2 | `src/hooks/usePlans.js` | Los tres estados de una petición (`loading`, `ready`, `error`), `reload()` e **ignorar la respuesta vieja** | `npm test -- usePlans` |
| 3 | `src/hooks/useAgentRun.js` | La máquina de estados de la ejecución de un plan: `idle`, `running`, `awaiting_approval`, `done`, `error`; un plan R2 no se aplica sin `approve()` | `npm test -- useAgentRun` |
| 4 | `src/ai/` | Revisar los tres hooks «escritos por una IA»: clasificar sus **6 fallos** con evidencia y arreglarlos | `npm run test:ai` |
| 5 | tu entregable | Por qué el contador de pendientes vive en `App` y no en la cabecera, y la tabla de uso de IA | — |

`App`, `Header`, `Inbox`, `RunPanel`, `PlanCard`, `Button`, `HashConfirm`, el esqueleto de carga, el aviso de error, los
datos y las pruebas ya están escritos: **no los cambies**. Ya integran tus hooks: el buscador usa `useDebounce`,
`App` usa `usePlans`, el panel de ejecución usa `useAgentRun`, y **el contador de pendientes vive en `App`**: la
cabecera recibe solo el número, no la lista (es la parte de «elevar el estado»).

Un plan tiene la misma forma que en la semana 10 (y que el de la pasarela de la semana 8):

```js
{ id: "P-01", op: "exams_destroy", risk: "R2", target: { id: 2, title: "Django · Plantillas", question_count: 4 },
  plan_hash: "d68ebfa913ec", proposed_by: "agente" }
```

## AGENTS.md: si usas un agente

Este repositorio trae un [`AGENTS.md`](AGENTS.md) en la raíz: el **contrato del agente**. Si usas un asistente de IA con
acceso al repositorio, el agente lo lee al empezar. Solo puede editar `src/hooks/` y `src/components/`; no toca
las pruebas, `package.json` ni instala paquetes; corre `npm test`; trabaja un archivo por turno; no decide en qué
componente vive un dato y no da por terminado nada con pruebas en rojo. El archivo trae también las **cuatro preguntas de
revisión del diff** que debes responder antes de aceptar lo que escribió.

## Qué hace cada script

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca la aplicación con recarga en vivo |
| `npm test` | Corre las pruebas contra **tu código** (`src/hooks`) |
| `npm run test:ai` | Corre las **mismas pruebas** contra los hooks de la IA (`src/ai`). Deben fallar 20: es el material de la Parte 4 |
| `npm run test:solutions` | Solo existe en la copia del docente (necesita `teacher/solutions/`); en la tuya avisa de que no está disponible |
| `npm run build` | Compila la aplicación en `dist/` (comprueba que el proyecto no está roto) |

Los componentes y las pruebas importan los hooks con el alias `@hooks`, que `vite.config.js` apunta a una carpeta u otra
según el **modo** (`.env.team`, `.env.ai`, `.env.solutions`). La aplicación (`dev` y `build`) siempre usa `src/hooks`.

Las pruebas **no esperan de verdad**: usan relojes falsos (`vi.useFakeTimers`) y promesas que la propia prueba resuelve o
rechaza, así que son rápidas (unos 3 segundos en total) y dan siempre el mismo resultado.

## Estructura

| Ruta | Para qué |
|---|---|
| `src/hooks/` | **Tuyo (Partes 1 a 3):** `useDebounce`, `usePlans` y `useAgentRun` por completar |
| `src/ai/` | Los mismos tres hooks «escritos por una IA» (Parte 4) |
| `src/components/` | Componentes ya escritos: `Header`, `Inbox`, `RunPanel`, `PlanCard`, `Button`, `HashConfirm`, esqueleto y aviso de error |
| `src/lib/` | `api.js` (la red simulada), el nombre del destino de un plan y la lectura y escritura segura de `localStorage` |
| `src/data/plans.js` | Los seis planes del agente, con el formato de la semana 8 |
| `src/test/` | Las pruebas de cada hook (`useDebounce`, `usePlans`, `useAgentRun`) y las de integración (`Inbox`, `App`) |
| `src/App.jsx`, `src/main.jsx`, `src/styles.css` | La aplicación, ya escrita |
| `.env.team`, `.env.ai`, `.env.solutions` | Qué carpeta usa cada modo de pruebas |
| `AGENTS.md` | El contrato del agente y las cuatro preguntas de revisión del diff |
| `teacher/` | Solo para el docente: soluciones y clave. **Se borra antes de repartir el repo** |

## Convenciones del curso

Código, nombres de variables y comentarios en inglés; explicaciones y entregables en español. Componentes en
PascalCase y hooks con el prefijo `use`.
