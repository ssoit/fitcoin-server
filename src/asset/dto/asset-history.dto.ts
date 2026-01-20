export class AssetHistoryItemDto {
  id: string;
  amount: number;
  reason: string;
  createdAt: Date;
}

export class AssetHistoryDto {
  items: AssetHistoryItemDto[];
  total: number;
  page: number;
  limit: number;
}
