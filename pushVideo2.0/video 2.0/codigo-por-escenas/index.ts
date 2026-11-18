import { SceneHook } from "./01_Hook";
import { SceneCovers } from "./02_Cobertura";
import { SceneStrengths } from "./03_Fortalezas";
import { SceneCashFlow } from "./04_FlujoDeCaja";
import { SceneJanuary } from "./05_Enero2027";
import { SceneRetirement } from "./06_Jubilacion";
import { SceneProtection } from "./07_Proteccion";
import { SceneInvest } from "./08_Inversiones";
import { SceneOrder } from "./09_Orden";
import { SceneCTA } from "./10_Cierre";

export * from "./comun";
export { SceneHook, SceneCovers, SceneStrengths, SceneCashFlow, SceneJanuary, SceneRetirement, SceneProtection, SceneInvest, SceneOrder, SceneCTA };

// Order matches the timeline in MichaelAdvisorV2.tsx (SCENES).
export const SCENE_COMPONENTS = [SceneHook, SceneCovers, SceneStrengths, SceneCashFlow, SceneJanuary, SceneRetirement, SceneProtection, SceneInvest, SceneOrder, SceneCTA];
