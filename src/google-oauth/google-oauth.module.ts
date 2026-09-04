import { Module, forwardRef } from '@nestjs/common';

import { GoogleOauthController } from './google-oauth.controller';
import { GoogleOauthService } from './google-oauth.service';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { CvParserModule } from '../cv-parser/cv-parser.module';

@Module({
  imports: [
    GoogleCalendarModule,
    GoogleSheetsModule,
    GoogleDriveModule,
    forwardRef(() => CvParserModule),
  ],
  controllers: [GoogleOauthController],
  providers: [GoogleOauthService],
  exports: [GoogleOauthService],
})
export class GoogleOauthModule {}