import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
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
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get comments for a post via query ?postId=' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments retrieved' })
  async getComments(
    @Query('postId') postId: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.commentsService.getCommentsByPost(
      postId,
      limit ? Number(limit) : 50,
      user,
    );
  }

  @Public()
  @Get('post/:postId')
  @ApiOperation({ summary: 'Get comments for a specific post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments retrieved' })
  async getCommentsByPost(
    @Param('postId') postId: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.commentsService.getCommentsByPost(
      postId,
      limit ? Number(limit) : 50,
      user,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single comment with its replies' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment retrieved' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.commentsService.findOne(id, user);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create a new comment or reply' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Comment created successfully',
  })
  async create(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.commentsService.createComment(dto.postId, user.id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':commentId/replies')
  @ApiOperation({ summary: 'Reply to an existing comment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reply created successfully',
  })
  async reply(
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.commentsService.createComment(dto.postId, user.id, {
      ...dto,
      parentId: commentId,
    });
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Edit/Update a comment (Author or Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.commentsService.updateComment(id, user.id, dto, user.role);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a comment and its replies (Comment Author, Post Author, or Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment deleted successfully',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: ActiveUserData) {
    return this.commentsService.deleteComment(id, user);
  }
}
