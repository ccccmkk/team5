import { MODELS } from "@/data/models";
import type { JeanModel, ModelId, SizeRow } from "./types";

export type {
  FitType,
  JeanModel,
  ModelId,
  SizeChart,
  SizeRow,
} from "./types";

/** 모델 목록에서 유도한다. 모델을 추가할 때 여기를 따로 고칠 필요가 없다. */
export const MODEL_IDS: ModelId[] = MODELS.map((m) => m.id);

export function listModels(): JeanModel[] {
  return MODELS;
}

export function isModelId(value: string): value is ModelId {
  return (MODEL_IDS as string[]).includes(value);
}

export function getModel(id: ModelId): JeanModel {
  const model = MODELS.find((m) => m.id === id);
  if (!model) {
    throw new Error(`알 수 없는 모델: ${id}`);
  }
  return model;
}

export function findSizeRow(
  id: ModelId,
  waistInch: number,
): SizeRow | undefined {
  return getModel(id).sizeChart.sizes.find((s) => s.waistInch === waistInch);
}
