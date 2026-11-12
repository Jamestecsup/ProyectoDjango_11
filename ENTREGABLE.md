# Los hooks del agente — comunicación entre componentes en ReactJS

**Entregable del laboratorio de la Semana 11**

| Dato | Valor |
|---|---|
| Curso | Desarrollo de Aplicaciones Empresariales (DAE) |
| Periodo | 2026-2 |
| Semana | 11 |
| Sección | 4-C24-A |
| Alumno | Michael Montgomery Rosell |
| Docente | Michael Montgomery Rosell |
| Actividad | DAE - Lab11 - Comunicación entre componentes |
| Proyecto base | Bandeja de aprobaciones de la Semana 10 |
| Repositorio | `ProyectoDjango_11` |
| Fecha | 11/11/2026 |
| Entorno | Windows 11 · Node v24.15.0 · npm 11.12.1 · VS Code |

---

## 1. Alcance: qué se implementó y con qué variante

La guía del laboratorio describe la variante **cartelera** (películas, favoritas, estrenos). El repositorio
entregado es la variante de la misma semana 11 que continúa la **bandeja de aprobaciones** de la Semana 10:
un agente de IA propone planes y una persona decide. Los criterios de la rúbrica son los mismos y se cubren
así:

| Criterio de la rúbrica | Dónde se cumple en este repositorio |
|---|---|
| Comunica componentes hermanos elevando el estado al ancestro común | `App` guarda `decisions` y pasa solo el número a `Header`; `Inbox` avisa con `onDecide` |
| Extrae a hooks propios la lógica con estado que se repite | `useDebounce`, `usePlans` y `useAgentRun` en `src/hooks/` |
| Integra la biblioteca de interfaz y resuelve carga y error | `PlansSkeleton` (cargando), `Inbox` (datos) y `ErrorBanner` (error) |
| Entrega el repositorio con los hooks y sus observaciones | Este documento, más la revisión de los hooks de `src/ai/` |

Los pasos de la guía que pertenecen solo a la variante cartelera (adaptador de películas, aviso emergente,
`useWindowSize`, `usePremieres`, carrusel) no existen en este repositorio. Su equivalente aquí es:
`targetLabel` (adaptador de datos ya escrito), el esqueleto de carga, `usePlans` (petición con tres estados) y
`useAgentRun` (máquina de estados de la ejecución).

---

## 2. Resultado de las pruebas

### 2.1. Línea base (antes de escribir los hooks)

```text
npm test        → 5 archivos, 57 pruebas: 17 pasan, 40 fallan
npm run test:ai → 5 archivos, 57 pruebas: 37 pasan, 20 fallan
```

### 2.2. Resultado final

```text
npm test        → 5 archivos, 57 pruebas: 57 pasan, 0 fallan
npm run test:ai → 5 archivos, 57 pruebas: 57 pasan, 0 fallan
npm run build   → built in 1.59s, sin errores
```

| Modo | Archivos | Pruebas | Pasan | Fallan |
|---|---:|---:|---:|---:|
| `npm test` (mi código, `src/hooks`) | 5 | 57 | **57** | **0** |
| `npm run test:ai` (versión IA, `src/ai`) | 5 | 57 | **57** | **0** |
| `npm run build` | — | — | **correcto** | — |

La aplicación se levantó con `npm run dev` en `http://localhost:5173`: mostró **Pendientes: 6**, los seis
planes y la consola sin errores.

---

## 3. Árbol de componentes y dónde vive cada dato

```text
App                                  ← decisions (estado) · network.failing (estado)
├── Header                           ← pendingCount (solo el número)
├── PlansSkeleton                    ← sin estado (se ve mientras status = "loading")
├── ErrorBanner                      ← error (prop) · onRetry = reload
└── Inbox                            ← query (estado) · quietQuery = useDebounce(query, 300)
    ├── PlanCard (por cada pendiente) ← sin estado: solo muestra y avisa con onDecide
    │   └── HashConfirm (solo R2)     ← typed (estado local de cada tarjeta)
    └── RunPanel                      ← run = useAgentRun(runAgent)
        └── Button                    ← sin estado: variante y props
```

| Dato | Vive en | Por qué ahí (el ancestro más bajo que lo necesita) |
|---|---|---|
| `decisions` | `App` | Lo necesitan `Inbox` (para separar pendientes y decididos) y `Header` (para contar). Su ancestro común más bajo es `App`. |
| `pendingCount` | `App` (derivado) | No es estado: se calcula en cada dibujado con `plans` y `decisions`. Se pasa a `Header` como número. |
| `query` | `Inbox` | Solo la usa la bandeja para filtrar; ninguna tarjeta ni la cabecera la necesitan. |
| `typed` | `HashConfirm` | Es efímero y propio de cada plan R2. Al desmontar la tarjeta debe desaparecer. |
| `run` | `RunPanel` | Solo el panel de ejecución muestra y cambia el estado de la ejecución del agente. |
| `plans`, `status`, `error` | `App` (desde `usePlans`) | Los necesita `App` para decidir qué pantalla dibujar y los pasan hacia abajo por props. |

### 3.1. Por qué el contador de pendientes no puede vivir en la cabecera

La cabecera es **hermana** de la bandeja, no su ancestro: no ve `plans` ni `decisions`. Si `Header` guardara el
contador:

- `Inbox` tendría que subir cada decisión hasta un tercer componente para avisar a `Header`, y `Header`
  necesitaría la **lista completa** de planes para poder contar. La cabecera pasaría a tener una copia del
  estado que ya vive en `App`.
- Habría dos verdades: la lista de `Inbox` y el número de `Header`. Una actualización que tocara una y no la
  otra dejaría el contador mintiendo.
- El contador es una **consecuencia** (`planes` menos decididos), no un hecho independiente. Guardarlo sería
  duplicar un dato derivado.

Al vivir en `App`, hay una sola fuente de verdad y la cabecera recibe solo el número: no se vuelve a dibujar
por cada tecla del buscador ni por cada detalle de los planes. `Header` queda como componente de
presentación.

---

## 4. Los tres hooks propios

### 4.1. `useDebounce(value, delay)` — `src/hooks/useDebounce.js`

```js
import { useEffect, useState } from "react";

export default function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

- El valor devuelto es un estado inicializado con `value`: en el primer dibujado no espera.
- Cada cambio cancela el temporizador anterior (la limpieza del efecto) y arranca uno nuevo. Los valores
  intermedios nunca se devuelven.
- Si cambia `delay`, el efecto se repite y se cuenta desde cero.
- Al desmontar, la limpieza cancela el temporizador: no queda ninguno vivo.

**Quién lo usa:** `Inbox`, en el buscador. El campo muestra `query` al instante y la lista filtra por
`quietQuery`, que solo cambia tras 300 ms sin teclear.

### 4.2. `usePlans(fetchPlans)` — `src/hooks/usePlans.js`

```js
import { useCallback, useEffect, useState } from "react";

export default function usePlans(fetchPlans) {
  const [status, setStatus] = useState("loading");
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setPlans([]);
    setError(null);

    fetchPlans().then(
      (data) => {
        if (cancelled) return;
        setPlans(data);
        setStatus("ready");
      },
      (failure) => {
        if (cancelled) return;
        setError(failure);
        setStatus("error");
      }
    );

    return () => {
      cancelled = true;
    };
  }, [fetchPlans, attempt]);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  return { status, plans, error, reload };
}
```

- Resuelve los **tres estados**: `loading`, `ready` y `error`. Si la promesa se rechaza, el estado pasa a
  `error` y no se queda cargando para siempre.
- **Ignora la respuesta vieja**: cada ejecución del efecto tiene su propio `cancelled`. Si se llama a
  `reload()`, cambia `fetchPlans` o el componente se desmonta, la respuesta anterior ya no toca el estado.
- `reload` mantiene la misma identidad entre dibujados (`useCallback`).
- La limpieza del efecto pone `cancelled = true`; no hay petición que pueda escribir después.

**Quién lo usa:** `App`, que dibuja `PlansSkeleton`, `Inbox` o `ErrorBanner` según `status`.

### 4.3. `useAgentRun(runAgent)` — `src/hooks/useAgentRun.js`

```js
import { useCallback, useEffect, useRef, useState } from "react";

const IDLE = { status: "idle", plan: null, result: null, error: null };

export default function useAgentRun(runAgent) {
  const [run, setRun] = useState(IDLE);
  const latest = useRef(run);
  const controller = useRef(null);

  const update = useCallback((next) => {
    latest.current = next;
    setRun(next);
  }, []);

  const start = useCallback(
    (plan) => {
      const { status } = latest.current;
      if (status === "running" || status === "awaiting_approval") return;
      if (!runAgent) return;

      const current = new AbortController();
      controller.current = current;
      update({ status: "running", plan, result: null, error: null });

      runAgent(plan, { signal: current.signal }).then(
        (result) => {
          if (current.signal.aborted) return;
          const nextStatus = plan.risk === "R2" ? "awaiting_approval" : "done";
          update({ status: nextStatus, plan, result, error: null });
        },
        (failure) => {
          if (current.signal.aborted) return;
          update({ status: "error", plan, result: null, error: failure });
        }
      );
    },
    [runAgent, update]
  );

  const approve = useCallback(() => {
    if (latest.current.status !== "awaiting_approval") return;
    update({ ...latest.current, status: "done" });
  }, [update]);

  const reject = useCallback(() => {
    const { status } = latest.current;
    if (status !== "running" && status !== "awaiting_approval") return;

    controller.current?.abort();
    controller.current = null;
    update(IDLE);
  }, [update]);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  return { ...run, start, approve, reject };
}
```

- Máquina de estados: `idle → running → done | awaiting_approval | error`.
- **Regla de seguridad:** un plan R2 nunca pasa de `running` a `done`; al terminar bien queda en
  `awaiting_approval` y solo `approve()` lo aplica. Un R1 va directo a `done`.
- `start` no lanza otra ejecución mientras hay una en curso o esperando aprobación.
- `reject` aborta la señal y descarta lo que llegue después.
- Al desmontar, el `useEffect` aborta el controlador: la promesa tardía no toca el estado.
- `runAgent` puede faltar mientras el equipo conecta la app: el hook sigue llamando a todos sus hooks y
  `start()` no hace nada hasta que la función aparece.

**Quién lo usa:** `RunPanel`, que muestra el estado y los botones **Ejecutar**, **Cancelar**,
**Confirmar y aplicar** y **Descartar**.

### 4.4. Qué lógica se extrajo y qué componentes la comparten

| Hook | Lógica extraída | Componente que lo usa | Qué habría que repetir sin él |
|---|---|---|---|
| `useDebounce` | Temporizador con cancelación y limpieza | `Inbox` (buscador) | `useState`, `useEffect`, `setTimeout` y `clearTimeout` dentro del componente, con el riesgo de dejar temporizadores vivos |
| `usePlans` | Petición con tres estados, `reload` y descarte de respuestas viejas | `App` | El mismo `useEffect`, los tres `useState`, la bandera `cancelled` y el contador de reintentos |
| `useAgentRun` | Máquina de estados, `AbortController`, regla R2 y limpieza al desmontar | `RunPanel` | Toda la transición de estados y la seguridad de R2 dentro del panel |

Los tres hooks se prueban **dos veces**: una contra `src/hooks` (`npm test`) y otra contra `src/ai`
(`npm run test:ai`). Esa segunda corrida es la que demuestra que el contrato del hook es el mismo y que el
componente no depende de una implementación concreta.

---

## 5. Parte 4 — Revisión de los hooks «escritos por una IA»

### 5.1. Línea base

`npm run test:ai` antes de tocar nada: **37 pasan, 20 fallan**. Las 20 fallas se agrupan en seis defectos.

### 5.2. Los seis fallos, con evidencia

| # | Archivo y línea | Defecto | Pruebas que lo detectan (antes) |
|---|---|---|---|
| 1 | `src/ai/useDebounce.js:7-11` | El efecto que crea el temporizador **no tiene limpieza**. Cada cambio deja vivo el temporizador anterior, así que se devuelven valores intermedios. | «un segundo cambio reinicia la cuenta…», «tres cambios seguidos…», «si el valor vuelve al de antes…», «si cambia delay…» |
| 2 | `src/ai/useDebounce.js:13-15` | La única limpieza está en un efecto con `[]`: solo corre al desmontar y cancela **el último** temporizador, no los anteriores. | «al desmontar con varios cambios en el aire no queda ningún temporizador vivo» |
| 3 | `src/ai/usePlans.js:18-20` | El `catch` solo hace `console.error`: no pone `status = "error"` ni guarda el error. La pantalla se queda cargando para siempre. | «si la petición falla pasa a error…», «después de un error, reload() limpia el error…» |
| 4 | `src/ai/usePlans.js:13-21` | No hay bandera de cancelación: una respuesta lenta pisa a la nueva (carrera de peticiones) y también escribe después de desmontar. | las tres de «ignora la respuesta vieja» |
| 5 | `src/ai/useAgentRun.js:8-10` | `return` antes de `useRef`/`useCallback` cuando falta `runAgent`: **hook condicional**, rompe las reglas de los hooks. | «si runAgent aparece en un dibujado posterior, el hook no se rompe y funciona» |
| 6 | `src/ai/useAgentRun.js:29-33` | Un plan **R2** va directo a `done`: se salta la aprobación humana. Además, no hay `useEffect` que aborte la ejecución al desmontar. | «al terminar bien pasa a awaiting_approval…», «solo approve() lo lleva a done…», «approve() mientras corre no salta la barrera…», «reject() en awaiting_approval…», «esperando aprobación…», «al desmontar… aborta su señal» |

### 5.3. Arreglos

| # | Arreglo | Archivo |
|---|---|---|
| 1 y 2 | Un solo efecto crea y cancela el temporizador; se elimina el efecto de limpieza con `[]`. | `src/ai/useDebounce.js` |
| 3 y 4 | El rechazo pasa a `status = "error"` con el error, y cada ejecución del efecto tiene su `cancelled` que la limpieza pone a `true`. | `src/ai/usePlans.js` |
| 5 y 6 | Todos los hooks se llaman en cada dibujado (sin `return` anticipado); `start()` no hace nada si falta `runAgent`; un R2 queda en `awaiting_approval`; un `useEffect` aborta el controlador al desmontar. | `src/ai/useAgentRun.js` |

Resultado después de los arreglos: **57/57 en verde** con `npm run test:ai`.

---

## 6. Las cuatro preguntas de revisión del diff

1. **¿Los hooks se llaman siempre en el mismo orden y en el nivel superior?**
   Sí. `useDebounce`, `usePlans` y `useAgentRun` llaman a sus hooks al principio, sin `if`, bucles ni `return`
   antes. El único que lo incumplía era el de la IA (`useAgentRun`), y se corrigió.
2. **¿Todo `useEffect` que abre algo lo limpia al repetirse y al desmontar?**
   Sí. `useDebounce` cancela su temporizador en la limpieza; `usePlans` pone `cancelled = true`; `useAgentRun`
   aborta el `AbortController` al desmontar. El efecto de `App` que escribe en `localStorage` no abre ningún
   recurso, así que no necesita limpieza.
3. **¿Se resuelven los tres estados y se ven en pantalla?**
   Sí. `usePlans` expone `loading`, `ready` y `error`; `App` dibuja `PlansSkeleton`, `Inbox` o `ErrorBanner`.
   Mientras carga, el contador muestra «…». La ejecución del agente tiene sus cinco estados
   (`idle`, `running`, `awaiting_approval`, `done`, `error`) visibles en `RunPanel`.
4. **¿El dato vive en el ancestro más bajo que lo necesita?**
   Sí. `decisions` está en `App` porque lo necesitan `Header` e `Inbox`; `query` en `Inbox`; `typed` en
   `HashConfirm`; `run` en `RunPanel`. No se subió ningún estado «por si acaso» ni se duplicó en un hijo.

---

## 7. Uso de IA

| Qué se le pidió | Qué respondió / hizo | Qué se aceptó o rechazó y por qué |
|---|---|---|
| Leer el repositorio y localizar los `TODO` | Identificó los tres hooks, las pruebas y la línea base (40 fallan) | **Aceptado.** Se verificó con `npm test`. |
| Escribir `useDebounce` | Propuso estado + efecto con `setTimeout` y limpieza | **Aceptado.** 10/10 pruebas del hook en verde. |
| Escribir `usePlans` | Propuso tres estados, `reload` con contador y bandera `cancelled` | **Aceptado.** 12/12 pruebas, incluidas las carreras y StrictMode. |
| Escribir `useAgentRun` | Propuso la máquina de estados, `latest` con `useRef`, `AbortController` y la barrera R2 | **Aceptado.** 18/18 pruebas, incluidas desmontaje y hooks condicionales. |
| Corregir los seis fallos de `src/ai` | Los clasificó con la prueba que detecta cada uno y los corrigió | **Aceptado.** `npm run test:ai` pasó de 37/57 a 57/57. |
| Dar el laboratorio por terminado | Se negó a cerrar con pruebas en rojo y ejecutó la suite completa | **Aceptado.** Es la regla del contrato del agente. |
| Crear archivos fuera de `src/hooks` y `src/components` | No lo hizo durante la implementación; el entregable es este documento aparte | **Aceptado con nota.** El código solo se tocó donde el contrato lo permite. |

La IA se usó como apoyo para analizar, proponer y redactar. **Las pruebas fueron el oráculo**: ningún cambio se
dio por bueno sin ejecutar la suite correspondiente.

---

## 8. Conclusiones

- Los datos bajan por props y las decisiones suben por eventos (`onDecide`). `PlanCard` no decide: avisa.
  `App` decide, guarda y calcula el contador.
- El estado debe ser mínimo: `decisions` y `query` son los únicos estados de la bandeja; pendientes,
  decididos, contadores y filtrados se derivan en cada dibujado.
- Un hook propio es útil cuando encapsula un ciclo de vida completo: temporizador, petición o máquina de
  estados. Así el componente queda limpio y la limpieza vive en un solo sitio.
- La limpieza no es opcional: sin ella quedan temporizadores vivos, respuestas viejas que pisan a las nuevas
  y ejecuciones que escriben después de desmontar.
- La seguridad de lo destructivo no se negocia: un R2 no se aplica sin `approve()`, y la interfaz no es la
  frontera de seguridad; el servidor de la semana 8 sigue teniendo la última palabra.
- La versión de la IA era plausible y compilaba, pero tenía seis fallos clásicos. Las pruebas los detectaron
  uno por uno; la IA acelera, pero no sustituye la revisión.

---

## 9. Anexos

### 9.1. Comandos ejecutados

```powershell
node -v
npm install
npm test
npm test -- useDebounce
npm test -- usePlans
npm test -- useAgentRun
npm run test:ai
npm run build
npm run dev
```

### 9.2. Estructura del proyecto

```text
ProyectoDjango_11/
├── src/
│   ├── hooks/                  # MI CÓDIGO (Partes 1–3)
│   │   ├── useDebounce.js
│   │   ├── usePlans.js
│   │   └── useAgentRun.js
│   ├── ai/                     # versión «escrita por una IA» (Parte 4)
│   │   ├── useDebounce.js
│   │   ├── usePlans.js
│   │   └── useAgentRun.js
│   ├── components/             # ya escritos: Header, Inbox, RunPanel, PlanCard,
│   │                           # Button, HashConfirm, PlansSkeleton, ErrorBanner
│   ├── lib/                    # api.js, plans.js, storage.js
│   ├── data/plans.js           # los seis planes del agente
│   ├── test/                   # pruebas de los hooks y de integración
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
├── vite.config.js
├── AGENTS.md
├── README.md
└── ENTREGABLE.md               # este documento
```

### 9.3. Observaciones y pendientes

- **Repositorio**: el proyecto se subió a `https://github.com/Jamestecsup/ProyectoDjango_11` en la rama `main`
  (commit `542354e`). `node_modules/`, `dist/` y `coverage/` quedan fuera por `.gitignore`. La subida la pidió
  expresamente la persona dueña del repositorio, porque el contrato del agente prohíbe hacer `git push` por su cuenta.
- **Capturas**: la aplicación se levantó con `npm run dev` en `http://localhost:5173` y se capturó con Chrome en
  modo headless (sin ventana visible): carga (`07-cargando`), bandeja completa (`01-app-cargada`), búsqueda
  (`02-buscador`), contador tras aprobar (`03-contador`), error con `?fail=1` (`04-error`), ejecución R2 detenida
  en `awaiting_approval` y ejecución R1 aplicada. Todas están incrustadas en el entregable del campus
  (`GLAB-S11-MMONTGOMERY-2026-02.docx`), junto con la salida de las pruebas y la estructura del proyecto.
- La carpeta `dist/` se generó al ejecutar `npm run build`; no se versiona.
- Las pruebas y la configuración (`src/test/`, `package.json`, `vite.config.js`, `.env.*`) no se modificaron.
