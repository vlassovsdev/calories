import { client } from './client'
import type { FoodItem, CreateFoodItemInput } from '@/types/api'

export const foodApi = {
  search: (q: string) =>
    client.get<FoodItem[]>(`/api/v1/food/items?q=${encodeURIComponent(q)}`),

  getById: (id: string) =>
    client.get<FoodItem>(`/api/v1/food/items/${id}`),

  create: (body: CreateFoodItemInput) =>
    client.post<FoodItem>('/api/v1/food/items', body),

  update: (id: string, body: CreateFoodItemInput) =>
    client.put<FoodItem>(`/api/v1/food/items/${id}`, body),

  delete: (id: string) =>
    client.delete<void>(`/api/v1/food/items/${id}`),
}
