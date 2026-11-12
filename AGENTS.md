# AGENTS.md — contrato del agente de este repositorio

Este archivo lo lee el agente de IA (TecsupCode u otro) al empezar. Es la frontera de confianza de la semana 8 aplicada
a tu propio asistente: **el agente propone y escribe; las pruebas y las personas deciden.**

## Qué puedes hacer

- Editar **solo** `src/hooks/` y `src/components/`.
- Correr `npm test` (y `npm run build`) cuantas veces haga falta.
- Proponer cambios **en un archivo por turno** y explicar en dos frases qué cambiaste y por qué.
- Dejar una bitácora corta de cada turno: archivo tocado, pruebas antes y después.

## Qué NO puedes hacer

- Tocar las pruebas (`src/test/`), `package.json`, `vite.config.js` ni los archivos `.env.*`.
- Instalar paquetes ni cambiar versiones.
- Subir al repositorio (`git push`) ni borrar archivos.
- **Decidir en qué componente vive un dato.** Eso lo decide el equipo y lo escribe en su entregable. Si un cambio
  exige mover un estado de un componente a otro, **detente y pregunta**.
- Dar por terminado nada con pruebas en rojo. Si no logras ponerlas en verde, dilo y muestra la salida de `npm test`.

## Cómo trabajar

1. Lee solo el archivo que te piden y su archivo de pruebas. No leas el repositorio entero.
2. Escribe el cambio, corre `npm test -- <nombre del archivo>` y pega la salida.
3. Los hooks se llaman siempre en el mismo orden y en el nivel superior del componente o del hook: sin `if`, bucles ni
   `return` antes de ellos.
4. Todo `useEffect` que abre algo (petición, temporizador, suscripción) lo cierra en su función de limpieza.

## Las cuatro preguntas de la revisión del diff

Antes de aceptar lo que escribió el agente, la persona responde por escrito:

1. ¿Los hooks se llaman siempre en el mismo orden y en el nivel superior (sin `if`, bucles ni `return` antes)?
2. ¿Todo `useEffect` que abre algo (petición, temporizador) lo **limpia** al repetirse y al desmontar?
3. ¿Se resuelven los **tres estados** (cargando, con datos, con error) y se ven en pantalla?
4. ¿El dato vive en el **ancestro más bajo** que lo necesita, o el agente lo subió «por si acaso»?

Una respuesta «no sé» cuenta como «no»: se vuelve a leer el diff o se corre una prueba que lo demuestre.
