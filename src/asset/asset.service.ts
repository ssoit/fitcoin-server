import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AssetSummaryDto } from './dto/asset-summary.dto';
import { AssetHistoryDto } from './dto/asset-history.dto';

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}

  async getAssetSummary(userId: string): Promise<AssetSummaryDto> {
    const [totalEarnedResult, earnedTodayResult] = await Promise.all([
      this.prisma.asset.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      this.getTodayEarned(userId),
    ]);

    const totalEarned = Number(totalEarnedResult._sum.amount || 0);

    return {
      totalBalance: totalEarned, // In MVP, balance = total earned (no spending yet)
      totalEarned,
      earnedToday: earnedTodayResult,
    };
  }

  async getAssetHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<AssetHistoryDto> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          reason: true,
          createdAt: true,
        },
      }),
      this.prisma.asset.count({ where: { userId } }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        amount: Number(item.amount),
      })),
      total,
      page,
      limit,
    };
  }

  private async getTodayEarned(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.asset.aggregate({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }
}
