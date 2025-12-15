export interface KpdSuggestion {
  code: string;
  name: string;
  description?: string;
  confidence: number;
  level: number;
  categoryId: string;
  isFinal: boolean;
  reason?: string;
}

export interface KpdSearchResponse {
  query: string;
  suggestions: KpdSuggestion[];
  cached: boolean;
  latencyMs?: number;
  remainingQueries: number;
}

export interface KpdCodeDetail {
  id: string;
  name: string;
  description?: string;
  level: number;
  categoryId: string;
  categoryName?: string;
  parentId?: string;
  parentName?: string;
  isFinal: boolean;
  children?: KpdCodeDetail[];
}

export interface KpdCategoryDetail {
  id: string;
  name: string;
  description?: string;
  codesCount: number;
}

export interface KpdStatsResponse {
  totalCategories: number;
  totalCodes: number;
  finalCodes: number;
  codesByLevel: Record<number, number>;
}
