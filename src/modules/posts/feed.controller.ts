import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { QueryFeedDto } from './dto/query-feed.dto';
import { PostsService } from './posts.service';

@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Get public social Feed with cursor pagination and type filtering (TEXT, DUA, QUESTION, ANNOUNCEMENT)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feed items and nextCursor retrieved successfully',
  })
  async getFeed(
    @Query() query: QueryFeedDto,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.postsService.getFeed(query, user);
  }
}
