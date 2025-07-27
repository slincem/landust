// index.ts
// Export all effect classes for easy importing

export type { IEffect, BaseEffect, EffectContext } from './Effect';
export { DamageEffect } from './DamageEffect';
export { HealEffect } from './HealEffect';
export { BuffApEffect } from './BuffApEffect';
export { DrainApEffect } from './DrainApEffect';
export { TeleportEffect } from './TeleportEffect';
export { PushEffect } from './PushEffect';

// Future effects can be added here:
// export { PullEffect } from './PullEffect';
// export { AreaHealEffect } from './AreaHealEffect';
// export { SwapEffect } from './SwapEffect';
// export { AreaDamageEffect } from './AreaDamageEffect'; 