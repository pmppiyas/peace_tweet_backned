import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum ShareContentType {
  POST = 'POST',
  DUA = 'DUA',
  BLOOD_REQUEST = 'BLOOD_REQUEST',
}

export enum ShareTarget {
  FEED = 'FEED',
  GROUP = 'GROUP',
  LINK = 'LINK',
}

export class CreateShareDto {
  @ApiProperty({
    enum: ShareContentType,
    example: ShareContentType.POST,
    description: 'Type of content to share (POST, DUA, BLOOD_REQUEST)',
  })
  @IsEnum(ShareContentType, { message: 'contentType must be POST, DUA, or BLOOD_REQUEST' })
  @IsNotEmpty()
  contentType: ShareContentType;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the Post, Dua, or BloodRequest being shared',
  })
  @IsUUID(4, { message: 'contentId must be a valid UUID' })
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    enum: ShareTarget,
    example: ShareTarget.FEED,
    description: 'Where to share: FEED (profile timeline), GROUP, or LINK',
  })
  @IsEnum(ShareTarget, { message: 'target must be FEED, GROUP, or LINK' })
  @IsNotEmpty()
  target: ShareTarget;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Group ID if target is GROUP',
  })
  @IsOptional()
  @IsUUID(4, { message: 'groupId must be a valid UUID' })
  groupId?: string;

  @ApiPropertyOptional({
    example: 'A valuable reminder for everyone.',
    description: 'Optional commentary / caption added by the user who shares',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Caption cannot exceed 2000 characters' })
  caption?: string;
}
