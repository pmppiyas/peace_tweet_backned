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
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create a new Post (TEXT, DUA, QUESTION, ANNOUNCEMENT)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Post created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid payload or missing duaId' })
  async create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.create(dto, user.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single Post by ID with author, dua, stats, and viewer status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post details retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Post not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.postsService.findOne(id, user);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update Post (Author or Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post updated successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to edit' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.update(id, dto, user);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete Post (Author or Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post deleted successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to delete' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.remove(id, user);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':postId/save')
  @ApiOperation({ summary: 'Save/Bookmark a Feed Post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post saved successfully' })
  async savePost(
    @Param('postId') postId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.savePost(postId, user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':postId/save')
  @ApiOperation({ summary: 'Remove a Feed Post from Saved' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post unsaved successfully' })
  async unsavePost(
    @Param('postId') postId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.unsavePost(postId, user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':postId/reaction')
  @ApiOperation({ summary: 'React (LIKE) to a Post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reaction toggled/added' })
  async react(
    @Param('postId') postId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.react(postId, user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':postId/reaction')
  @ApiOperation({ summary: 'Remove reaction from a Post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reaction removed' })
  async unreact(
    @Param('postId') postId: string,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.unreact(postId, user.id);
  }

  @Public()
  @Get(':postId/comments')
  @ApiOperation({ summary: 'Get comments for a Post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments list retrieved' })
  async getComments(
    @Param('postId') postId: string,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.getComments(postId, limit ? Number(limit) : 50);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':postId/comments')
  @ApiOperation({ summary: 'Add a comment to a Post' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Comment created successfully' })
  async createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.postsService.createComment(postId, user.id, dto);
  }
}
