# Sistema de Efectos Desacoplado

Este directorio contiene el nuevo sistema de efectos desacoplado para el juego táctico por turnos. El sistema reemplaza el anterior enfoque monolítico basado en switch con un sistema de clases extensible y mantenible.

## Arquitectura

### Componentes Principales

1. **IEffect Interface** (`Effect.ts`)
   - Interfaz base que todos los efectos deben implementar
   - Define el método `apply(caster, target, context)` que cada efecto debe implementar

2. **BaseEffect Class** (`Effect.ts`)
   - Clase abstracta que proporciona funcionalidad común
   - Maneja feedback visual con FloatingText
   - Proporciona métodos helper para posicionamiento

3. **EffectFactory** (`EffectEngine.ts`)
   - Factory pattern para crear instancias de efectos
   - Mapea tipos de efectos a sus implementaciones correspondientes
   - Fácil de extender para nuevos tipos de efectos

4. **EffectEngine** (`EffectEngine.ts`)
   - Mantiene las APIs públicas existentes
   - Delega la lógica a los efectos individuales
   - Maneja errores y logging

### Efectos Implementados

- **DamageEffect**: Aplica daño a unidades objetivo
- **HealEffect**: Cura unidades objetivo
- **BuffApEffect**: Aplica buffs de AP temporales
- **DrainApEffect**: Drena AP de unidades objetivo
- **TeleportEffect**: Teletransporta al lanzador
- **PushEffect**: Empuja unidades lejos del lanzador (ejemplo de extensibilidad)

## Cómo Añadir un Nuevo Efecto

### 1. Crear la Clase del Efecto

```typescript
// MyNewEffect.ts
import { BaseEffect } from './Effect';
import type { Unit } from '../Unit';
import type { EffectContext } from './Effect';

export class MyNewEffect extends BaseEffect {
  constructor(value: number, customParam?: string) {
    super(value);
    // Inicializar parámetros específicos
  }

  apply(caster: Unit, target: Unit | null, context?: EffectContext): boolean {
    // Implementar lógica del efecto
    // Mostrar feedback visual si es necesario
    this.showFeedback('My Effect!', target, context, '#color');
    return true; // o false si falla
  }
}
```

### 2. Actualizar EffectFactory

```typescript
// En EffectEngine.ts
import { MyNewEffect } from './effects';

export type EffectType = 'damage' | 'heal' | 'my_new_effect';

static createEffect(config: SpellEffectConfig): IEffect {
  switch (config.type) {
    // ... casos existentes ...
    case 'my_new_effect':
      return new MyNewEffect(config.value, config.customParam);
    default:
      throw new Error(`Unknown effect type: ${config.type}`);
  }
}
```

### 3. Exportar en index.ts

```typescript
// En index.ts
export { MyNewEffect } from './MyNewEffect';
```

## Ventajas del Nuevo Sistema

### Mantenibilidad
- Cada efecto vive en su propio archivo
- Lógica específica aislada en clases individuales
- Fácil de debuggear y testear

### Extensibilidad
- Añadir nuevos efectos es solo crear una nueva clase
- No requiere modificar código existente
- Factory pattern permite mapeo dinámico

### Parametrizabilidad
- Cada efecto puede tener sus propios parámetros
- Configuración flexible a través de SpellEffectConfig
- Fácil de extender con nuevos campos

### Preparado para el Futuro
- Separación clara entre lógica y feedback visual
- Inyección de dependencias a través de context
- APIs consistentes y bien documentadas

## Mejores Prácticas

1. **Siempre extender BaseEffect** para efectos que necesiten feedback visual
2. **Usar showFeedback()** para mostrar texto flotante
3. **Validar parámetros** en el constructor
4. **Manejar errores graciosamente** retornando false
5. **Documentar con comentarios en inglés** explicando el propósito
6. **Mantener responsabilidad única** - cada efecto hace una cosa bien
7. **Usar tipos TypeScript** para mejor seguridad de tipos

## Compatibilidad

El nuevo sistema mantiene **100% de compatibilidad** con las APIs públicas existentes:
- `EffectEngine.applyEffect()` - misma firma
- `EffectEngine.applySpell()` - misma firma
- `EffectEngine.getEffectColor()` - mantenido para compatibilidad

## Ejemplos de Uso

### Efecto Simple (Damage)
```typescript
const damageEffect = new DamageEffect(25);
damageEffect.apply(caster, target, context);
```

### Efecto con Estado (Buff)
```typescript
const buffEffect = new BuffApEffect(3, 2, 'spellName');
buffEffect.apply(caster, target, context);
```

### Efecto de Posición (Teleport)
```typescript
const teleportEffect = new TeleportEffect(0);
teleportEffect.apply(caster, null, { map, scene, cellPosition });
```

## Próximos Pasos

El sistema está diseñado para soportar fácilmente:
- Efectos de área (AreaDamage, AreaHeal)
- Efectos de movimiento (Pull, Swap)
- Efectos de estado complejos (Poison, Stun)
- Efectos de cadena (Chain Lightning)
- Efectos condicionales (If/Else logic) 