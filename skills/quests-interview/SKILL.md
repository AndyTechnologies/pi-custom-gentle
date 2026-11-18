---
name: quests-interview
description: "Trigger: custom-odd interview, custom-odd questions, bounded interview, user decision. Resolves blocking decisions for Product Quest and Architecture Quest using native Gentle Shell tools. Controlled 50-question budget with decision-tree discipline."
license: Apache-2.0
metadata:
  author: AndyTechnologies
  version: "1.0.0"
---

# Custom ODD Interview (quests-interview) Skill

## 7. Responsibility

`quests-interview` es un procedimiento interno utilizado por el orquestador para resolver decisiones humanas que bloquean Product Quest o Architecture Quest.

No es un agente autónomo y no debe introducir otro sistema de orquestación.

Únicamente el orquestador puede formular preguntas al usuario. Los workers y subagentes pueden identificar gaps y proponer preguntas, pero deben devolverlas al orquestador.

## 7.2. Herramientas nativas obligatorias

Utiliza exclusivamente las herramientas interactivas nativas de Gentle Shell para hacer las preguntas:

### `ask_user_question`

Úsala cuando:

- Existan varias preguntas independientes que puedan resolverse en una misma interacción.
- Se necesiten entre una y cuatro preguntas en la llamada.
- Cada pregunta pueda representarse mediante entre dos y cuatro opciones.
- Sea útil permitir respuestas multi-select.
- Se necesiten descripciones para comparar alternativas.

### `ask_user_choice`

Úsala cuando:

- Exista una única decisión.
- Pueda representarse mediante entre dos y cuatro alternativas ordenadas.
- Una pregunta de selección individual sea suficiente.

La respuesta libre está habilitada por defecto.

No establezcas `allowCustomResponse: false` para entrevistas ordinarias de producto o arquitectura. Esa restricción está reservada a consentimientos, autorizaciones de mantenimiento y decisiones que exigen un token exacto.

## 7.3. Reglas de entrevista

- Mantén el límite máximo de 50 preguntas heredado de `grilling`.
- Este límite es un presupuesto de seguridad, no un objetivo que debas alcanzar.
- Formula preguntas progresivamente, en función de las respuestas recibidas.
- No preguntes lo que ya está establecido en requisitos, documentación o decisiones anteriores.
- No conviertas decisiones técnicas que pertenecen al agente en preguntas para el usuario.
- Presenta las alternativas relevantes y sus consecuencias.
- Evita preguntas ambiguas, redundantes o excesivamente generales.
- Prioriza resolver decisiones bloqueantes.
- Registra las respuestas del usuario sin alterar su significado.
- No marques una decisión aceptada hasta disponer de evidencia suficiente.
- Detén la entrevista cuando las decisiones necesarias estén resueltas o cuando el usuario decida detenerla.

Cuando una respuesta abra una nueva ambigüedad relevante, realiza una pregunta de seguimiento en lugar de asumir su resolución.

## 7.4. Cancelación y ausencia de interfaz

Respeta el contrato real de Gentle Shell:

- Si el usuario cancela la interacción, no inventes una respuesta.
- Si las herramientas no están disponibles por ejecutarse en un modo no interactivo, informa del bloqueo y aplica el fallback oficial del orquestador.
- No simules una respuesta.
- No implementes una interfaz TUI propia.
- No sustituyas las herramientas por `ctx.ui.input`, `ctx.ui.select`, diálogos personalizados o prompts externos.
- No continúes con decisiones que dependan de una respuesta humana pendiente.

Si el límite de preguntas se agota sin resolver una decisión bloqueante, registra el estado y devuelve el control al usuario.

## 7.5. Compatibilidad con las quests

`product-quest` y `architecture-quest` deben invocar `quests-interview` a través del mecanismo de descubrimiento de skills.

La nueva skill debe ser la referencia única para la metodología de entrevista.

Elimina referencias obsoletas al procedimiento interno `quest-interview` y al uso directo de `grilling` como implementación runtime.

Conserva la distinción existente de Gentle Shell: no invoques automáticamente `grill-me`, que es una herramienta/skill de uso explícito del usuario.

## Ejecución del entrevista

### Paso 1: Identificar decisiones bloqueantes

El orquestador identifica qué decisiones humanas bloquean el progreso de Product Quest o Architecture Quest.

### Paso 2: Formular preguntas

El orquestador utiliza `ask_user_question` o `ask_user_choice` según el caso:

- **Una sola decisión** con 2-4 alternativas ordenadas: usar `ask_user_choice`.
- **Varias preguntas independientes** (1-4): usar `ask_user_question` con hasta 4 preguntas.
- **Preguntas con opciones** para cada una: cada pregunta tiene sus propias alternativas.
- **Respuesta libre disponible**: la fila de respuesta libre ya está disponible por defecto.

### Paso 3: Procesar respuestas

- Registrar respuestas del usuario sin alterar su significado.
- Si una respuesta abre una nueva ambigüedad relevante, realizar una pregunta de seguimiento.
- No marcar una decisión aceptada hasta disponer de evidencia suficiente.
- Detener la entrevista cuando las decisiones necesarias estén resueltas o el usuario decida detenerla.

### Paso 4: Entregar resultados al orquestador

- Las respuestas formuladas se transmiten al orquestador para continuar Product Quest o Architecture Quest.
- No hay interfaz TUI propia; las herramientas nativas de Gentle Shell manejan la interacción.
- Si las herramientas no están disponibles (modo no interactivo), informar del bloqueo y aplicar el fallback oficial.

## Limitación de preguntas

- **Límite máximo: 50 preguntas** (presupuesto de seguridad heredado de grilling).
- Este límite es un guardia, no un objetivo.
- Si se agota el presupuesto sin resolver una decisión bloqueante, registra el estado y devuelve el control al usuario.
- No inventes respuestas cuando el usuario cancele o el límite se agote.

## Integración con product-quest

Product Quest invoca quests-interview cuando:

- Existen gaps de producto `blocking` que requieren decisión humana.
- No existen respuestas documentadas en requisitos, ADRs o tareas anteriores.
- Es necesario formular preguntas progresivas al usuario para clasificar gaps.

La estructura de preguntas debe seguir el árbol de decisiones del interview interno, con un máximo de 50 preguntas totales.

Al completar la entrevista, Product Quest:

- Clasifica cada gap como `blocking` (resuelto), `assumable` (hipótesis reversible documentada) o `non-blocking` (convención aplicada).
- Crea/updatea las cláusulas `PC-XX` en el `## Product Contract` del documento ODD.
- Marca el estado de cada cláusula (`accepted | assumed | deferred`).
- Documenta la procedencia (`user_requirement | explicit_answer | existing_decision | convention | reversible_hypothesis`).
- Si el límite de 50 preguntas se alcanza, registra las preguntas pendientes y devuelve el control al usuario con el estado parcial.

## Integración con architecture-quest

Architecture Quest invoca quests-interview cuando:

- Existen decisiones arquitectónicas `blocking` que requieren autorización humana.
- No existen decisiones documentadas en ADRs, convenciones o el estado actual.
- Es necesario formular preguntas progresivas sobre límites, dependencias, patrones arquitectónicos.

La estructura de preguntas sigue el mismo patrón de máximo 50 preguntas.

Al completar la entrevista, Architecture Quest:

- Clasifica cada decisión arquitectónica resuelta.
- Crea/updatea las cláusulas `AC-XX` en el `## Architectural Contract` del documento ODD.
- Marca el estado de cada cláusula (`proposed | accepted | rejected | replaced`).
- Documenta la procedencia de cada decisión.
- Documenta riesgos y suposiciones identificadas.
- Si el límite de 50 preguntas se alcanza, registra las preguntas pendientes y devuelve el control al usuario con el estado parcial.

## Output Contract

Upon completion, the orchestrator has:

- [ ] Blocking decisions identified and resolved (or explicitly deferred with user acknowledgment)
- [ ] Assumable gaps documented as explicit reversible hypotheses with validation plans
- [ ] Non-blocking gaps resolved via convention
- [ ] Each answer recorded with verbatim user response and provenance type
- [ ] Interview conducted within 50-question budget
- [ ] Decision-tree discipline followed (progressive questioning)
- [ ] Answers transmitted to orchestrator for Product Quest / Architecture Quest continuation
- [ ] No simulated responses; native Gentle Shell tools used exclusively
- [ ] Cancellation respected (no invented answers)
- [ ] Tool unavailability reported with official fallback

## Product Contract Integration Format

After quests-interview completion, Product Contract clauses are updated:

```markdown
### PC-XX: [Decision title]
- **Context**: [Functional problem and gap]
- **Decision**: [Accepted rule/flow/scope/behavior]
- **Invariants**: [Properties that must hold]
- **Constraints**: [Boundaries, limits, dependencies]
- **Acceptance Criteria**: [Observable conditions for compliance]
- **Expected Evidence**: [Tests, demos, specs]
- **Provenance**: explicit_answer (verbatim user response)
- **State**: accepted
- **Validation**: [How to verify]
- **Cross-refs**: [AC-XX from Architecture Quest if related]
```

## Architectural Contract Integration Format

After quests-interview completion, Architectural Contract clauses are updated:

```markdown
### AC-XX: [Decision title]
- **Context**: [Functional problem and scope]
- **Decision**: [Accepted architecture/boundaries/patterns]
- **Invariants**: [Properties that must hold]
- **Constraints**: [Allowed/prohibited dependencies, data ownership, contracts]
- **Acceptance Criteria**: [Observable conditions for compliance]
- **Expected Evidence**: [Files, interfaces, tests, results]
- **Provenance**: explicit_answer (verbatim user response)
- **State**: accepted
```