# Linters y analizadores en los cuatro stacks del curso

**Estos archivos no participan del build ni del pipeline de este repositorio.** Son material de
referencia del Módulo 6, que exige presentar los cuatro stacks del curso en paralelo: Python, C++,
Flutter/Dart y Java/Spring Boot. Este proyecto es TypeScript/Next.js, así que su analizador real es
ESLint (`eslint.config.mjs`) más `tsc --noEmit`, los dos ya integrados al CI por el Módulo 5.

Se guardan acá, y no en la raíz, precisamente para que ninguna herramienta los tome por
configuración activa de este proyecto.

## Equivalencias

| Rol | Material del curso | En este repo | Estado |
|---|---|---|---|
| Linter de smells y estilo | `pylint` · `PMD` · `dart analyze` | **ESLint** | en CI |
| Verificador de tipos | `mypy` | **`tsc --noEmit`** | en CI |
| Límite de complejidad ciclomática | `max-branches=12` · Checkstyle `CyclomaticComplexity` | regla `complexity` de ESLint | `eslint.metrics.mjs` (fase 1, solo medición) |
| Dashboard cross-language | SonarCloud | SonarCloud | pendiente |
| Mutation testing | `mutmut` · `mull` · `mutation_test` · `pitest` | **Stryker** | pendiente |

## Lo que comparten los cuatro

La detección de **code smells genéricos** —funciones largas, complejidad ciclomática alta, código
duplicado— es transferible entre lenguajes. La sintaxis de configuración no lo es. Ese es el motivo
de que el catálogo del Módulo 6 sirva igual para un repo TypeScript aunque ninguna de estas cuatro
herramientas corra acá.

## Lo que solo atrapa cada uno

- **Python** — `mypy` detecta incompatibilidades de tipo que el intérprete dinámico no vería hasta
  tiempo de ejecución.
- **C++** — `clang-tidy` y `cppcheck` detectan *undefined behavior* de memoria: punteros colgantes,
  memoria no inicializada, doble liberación. Una categoría de bug que no existe en los otros tres,
  todos con recolector de basura y sin punteros crudos.
- **Flutter/Dart** — `very_good_analysis` es intencionalmente más estricto que lo necesario para
  compilar: busca atrapar en el analizador lo que en un equipo grande terminaría siendo el mismo
  comentario de code review repetido una y otra vez.
- **Java/Spring Boot** — `SpotBugs` analiza **bytecode ya compilado**, no código fuente. Eso le
  permite ver patrones que dependen de cómo el compilador tradujo el código, a costa de exigir un
  build previo que Checkstyle y PMD no necesitan.

## Archivos

| Archivo | Stack | Herramientas |
|---|---|---|
| `pylintrc` | Python | pylint (+ mypy por línea de comandos) |
| `clang-tidy.yml` | C++ | clang-tidy (+ cppcheck por línea de comandos) |
| `analysis_options.yaml` | Flutter/Dart | dart analyze + very_good_analysis |
| `checkstyle.xml` | Java/Spring Boot | Checkstyle (+ PMD y SpotBugs vía Maven) |

Los nombres de `pylintrc` y `clang-tidy.yml` van sin el punto inicial a propósito, por la misma
razón que la carpeta: que ninguna herramienta los descubra como configuración de este proyecto. En
un repo Python o C++ real se llamarían `.pylintrc` y `.clang-tidy`, en la raíz.
