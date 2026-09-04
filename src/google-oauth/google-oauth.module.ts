import {
  Module,
  forwardRef,
} from '@nestjs/common';

import { GoogleOauthController } from './google-oauth.controller';
import { GoogleOauthService } from './google-oauth.service';

import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    forwardRef(() => SyncModule),
  ],
  controllers: [
    GoogleOauthController,
  ],
  providers: [
    GoogleOauthService,
  ],
  exports: [
    GoogleOauthService,
  ],
})
export class GoogleOauthModule {}