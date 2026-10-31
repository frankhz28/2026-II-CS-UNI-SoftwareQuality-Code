## Qué cambia y por qué

<!-- Suficiente contexto para revisar sin preguntar nada. -->

## Cómo se probó

- [ ] `pnpm test` en verde localmente
- [ ] `pnpm lint` sin warnings nuevos
- [ ] `pnpm exec tsc --noEmit` sin errores
- [ ] Probado manualmente en la app

## Si este PR es un refactor (Módulo 6)

- [ ] El comportamiento observable **no** cambia
- [ ] La suite estaba en verde **antes** del cambio (regla de oro del módulo)
- [ ] Técnica de refactor aplicada, nombrada: <!-- Extract Method / Extract Class / Replace Magic Number with Named Constant / Replace Conditional with Polymorphism -->
- [ ] Code smell que resuelve, con archivo y línea:

## Checklist

- [ ] El código sigue las convenciones del proyecto
- [ ] No quedan `TODO` sin Issue asociado
- [ ] El pipeline de CI está en verde
- [ ] Commits con Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `ci:`, `docs:`, `chore:`)
