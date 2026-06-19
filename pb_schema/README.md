# Esquema PocketBase — IAGAMI Sala Situacional del Agua

Modelo de datos definitivo con **relaciones reales** (no texto libre).

## Cadena relacional

```
comunas
  └─(relation)─ consejos_comunales        (1 comuna → N consejos)
                  └─(relation)─ infraestructura_hidrica   (1 consejo → N registros)
                                  └─(relation)─ evidencias_hidricas  (fotos/PDF/actas)
                  └─(relation)─ diagnosticos_ambientales
                  └─(relation)─ denuncias_comunitarias
```

## Cómo importar (una sola vez, en el servidor PocketBase)

1. Abre el **Admin UI** de PocketBase: `http://TU_SERVIDOR:8090/_/`
2. Ve a **Settings → Import collections**.
3. Pega el contenido de `iagami_sala_situacional.json` o súbelo.
4. Revisa el diff y pulsa **Import**.

> ⚠️ Las colecciones ya traen IDs fijos de 15 caracteres para que las
> relaciones resuelvan correctamente. Si ya creaste `comunas` o
> `consejos_comunales` manualmente con otro ID, elimínalas antes de
> importar para evitar duplicados.

## Reglas de acceso (API Rules) incluidas

| Colección | List/View | Create | Update/Delete |
|---|---|---|---|
| comunas | público | público (auto-registro ciudadano) | solo staff autenticado |
| consejos_comunales | público | público | solo staff |
| infraestructura_hidrica | público | solo staff | solo staff |
| evidencias_hidricas | público | solo staff | solo staff |
| diagnosticos_ambientales | público | público | solo staff |
| denuncias_comunitarias | **solo staff** | público | solo staff |

`staff` = `@request.auth.id != ""` (token de la colección `admins`, nunca `_superusers`).

## Integridad referencial (cascadeDelete)

- Borrar una **infraestructura_hidrica** → borra sus **evidencias_hidricas** (y sus archivos en Storage).
- Borrar un **consejo_comunal** → borra su **infraestructura_hidrica** (y en cascada las evidencias).
- Borrar una **comuna** NO borra sus consejos (cascadeDelete=false), para evitar borrados masivos accidentales; reasignar o borrar manualmente.
