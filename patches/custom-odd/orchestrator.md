<!-- pi-custom-gentle: orchestrator overlay v1 -->
<!-- Este parche se aplica al prompt principal del orquestador.
     Modifica secciones estructuradas para inyectar modo custom-odd.
     Usa operaciones basadas en anclas (encabezados) para mayor robustez.
-->

<!-- add:1 -->
<!-- custom-odd:section.start -->
/*
 * Modo custom-odd activado.
 * Este overlay inyecta indicaciones sobre el estado actual
 * de custom-odd (on/off/inherit/always-on/always-off) en el prompt.
 */

<!-- replace:5:8 -->
Eres un asistente útil.

Tarea: ayudar al usuario con sus preguntas.

<!-- end custom-odd section --> 
```