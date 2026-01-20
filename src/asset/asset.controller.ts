import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AssetService } from './asset.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { AssetSummaryDto } from './dto/asset-summary.dto';
import { AssetHistoryDto } from './dto/asset-history.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  async getAssetSummary(@CurrentUser() user: JwtPayload): Promise<AssetSummaryDto> {
    return this.assetService.getAssetSummary(user.sub);
  }

  @Get('history')
  async getAssetHistory(
    @CurrentUser() user: JwtPayload,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<AssetHistoryDto> {
    return this.assetService.getAssetHistory(user.sub, page, limit);
  }
}
