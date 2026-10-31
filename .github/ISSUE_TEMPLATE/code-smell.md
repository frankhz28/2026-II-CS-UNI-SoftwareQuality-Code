---
name: Code smell detectado
about: Registrar un code smell real encontrado por el linter o el análisis estático
labels: code-smell, deuda-tecnica
---

**Smell del catálogo**
<!-- Long Method / Duplicated Code / God Class / Feature Envy / Magic Numbers / Dead Code -->

**Dónde**
<!-- archivo:línea — tiene que ser real, no inventado (requisito del checklist del Módulo 6) -->

**Cómo se detectó**
<!-- regla de ESLint, SonarCloud, o medición manual -->

**Métrica, si aplica**
<!-- complejidad ciclomática, líneas, número de useState... -->

**Riesgo que anticipa**
<!-- qué bug se vuelve fácil de escribir por culpa de este smell -->

**Técnica de refactor propuesta**
<!-- nombrada: Extract Method, Extract Class, Replace Magic Number with Named Constant, ... -->

**¿Urge pagarla?** (criterios del Módulo 1)
- [ ] Esta zona del código se modifica seguido
- [ ] Concentra una parte desproporcionada de los bugs
- [ ] Nadie se anima a tocarla sin ayuda
- [ ] Bloquea algo del trabajo actual
