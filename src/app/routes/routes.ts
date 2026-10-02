import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { bloodRoutes } from '../modules/blood/blood.routes';
import { bookmarksRoutes } from '../modules/bookmarks/bookmarks.routes';
import { categoriesRoutes } from '../modules/categories/categories.routes';
import { duaAudiosRoutes } from '../modules/dua-audios/dua-audios.routes';
import { duaReferencesRoutes } from '../modules/dua-references/dua-references.routes';
import { duasRoutes } from '../modules/duas/duas.routes';
import { friendsRoutes } from '../modules/friends/friends.routes';
import { groupsRoutes } from '../modules/groups/groups.routes';
import { feedRoutes, postsRoutes } from '../modules/posts/posts.routes';
import { sourcesRoutes } from '../modules/sources/sources.routes';
import { uploadsRoutes } from '../modules/uploads/uploads.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { searchRoutes } from '../modules/search/search.routes';

export const router = Router();

const moduleRouter = [
  { path: '/auth', route: authRoutes },
  { path: '/users', route: usersRoutes },
  { path: '/blood', route: bloodRoutes },
  { path: '/uploads', route: uploadsRoutes },
  { path: '/friends', route: friendsRoutes },
  { path: '/groups', route: groupsRoutes },
  { path: '/posts', route: postsRoutes },
  { path: '/feed', route: feedRoutes },
  { path: '/categories', route: categoriesRoutes },
  { path: '/sources', route: sourcesRoutes },
  { path: '/duas/:duaId/audios', route: duaAudiosRoutes },
  { path: '/duas/:duaId/references', route: duaReferencesRoutes },
  { path: '/duas', route: duasRoutes },
  { path: '/search', route: searchRoutes },
  { path: '/', route: bookmarksRoutes },
];

moduleRouter.forEach((r) => {
  router.use(r.path, r.route);
});
