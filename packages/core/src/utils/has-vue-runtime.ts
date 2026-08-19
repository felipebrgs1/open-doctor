import type { ProjectInfo } from "../types/index.js";

const VUE_FRAMEWORKS: ReadonlySet<ProjectInfo["framework"]> = new Set(["vue", "nuxt"]);

export const hasVueRuntime = (project: ProjectInfo): boolean =>
  project.vueVersion != null ||
  project.nuxtVersion != null ||
  VUE_FRAMEWORKS.has(project.framework);
