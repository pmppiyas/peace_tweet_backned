import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import envConfig from './config/env.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './cache/cache.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DuaAudiosModule } from './modules/dua-audios/dua-audios.module';
import { DuaReferencesModule } from './modules/dua-references/dua-references.module';
import { DuasModule } from './modules/duas/duas.module';
import { PostsModule } from './modules/posts/posts.module';
import { SourcesModule } from './modules/sources/sources.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    CacheModule,
    CommonModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    SourcesModule,
    DuasModule,
    DuaReferencesModule,
    DuaAudiosModule,
    BookmarksModule,
    PostsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
