export type LocalWorkspace = {
  id: string;
  name: string;
  type: string;
  goal: string;
  successCriteria: string;
  status: string;
  updatedAt: string;
  taskCount: number;
  materialCount: number;
  experienceCount: number;
};

export const LOCAL_WORKSPACES_KEY = "marketing:local-workspaces";

export function createLocalWorkspace(input: Pick<LocalWorkspace, "name" | "type" | "goal" | "successCriteria">): LocalWorkspace {
  return {
    id: `local-${Date.now()}`,
    ...input,
    status: "新建",
    updatedAt: "刚刚",
    taskCount: 0,
    materialCount: 0,
    experienceCount: 0,
  };
}
