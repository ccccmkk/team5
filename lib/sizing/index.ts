import { MODELS } from "@/data/models";
import type { JeanModel, ModelId, SizeRow } from "./types";

export type {
  JeanModel,
  ModelId,
  SizeChart,
  SizeRow,
} from "./types";

export const MODEL_IDS: ModelId[] = ["501", "517"];

export function listModels(): JeanModel[] {
  return MODELS;
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
