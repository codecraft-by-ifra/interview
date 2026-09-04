import { Module, forwardRef } from '@nestjs/common';

import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

import { GoogleOauthModule } from '../google-oauth/google-oauth.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { CvParserModule } from '../cv-parser/cv-parser.module';

@Module({
  imports: [
    forwardRef(() => GoogleOauthModule),
    GoogleCalendarModule,
    GoogleSheetsModule,
    GoogleDriveModule,
    CvParserModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}