import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { BookmarksService } from './bookmarks.service';
import { QueryBookmarkDto } from './dto/query-bookmark.dto';

@ApiTags('Saved Duas (Bookmarks)')
@ApiBearerAuth('JWT-auth')
@Controller()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post('duas/:duaId/save')
  @ApiOperation({ summary: 'Save/Bookmark a Dua for current logged-in user' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Dua saved successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Dua is already saved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async saveDua(
    @Param('duaId') duaId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.bookmarksService.saveDua(user.id, duaId);
  }

  @Delete('duas/:duaId/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove/Unsave a Dua from current user bookmarks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dua unsaved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found in saved list' })
  async unsaveDua(
    @Param('duaId') duaId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.bookmarksService.unsaveDua(user.id, duaId);
  }

  @Get('users/me/saved-duas')
  @ApiOperation({ summary: 'Get paginated list of saved Duas for current logged-in user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Saved Duas retrieved' })
  async getSavedDuas(
    @CurrentUser() user: ActiveUserData,
    @Query() query: QueryBookmarkDto,
  ) {
    return this.bookmarksService.getSavedDuas(user.id, query);
  }
}
