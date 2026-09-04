import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleOauthModule } from './google-oauth/google-oauth.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { CvParserModule } from './cv-parser/cv-parser.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GoogleOauthModule,
    GoogleCalendarModule,
    GoogleSheetsModule,
    CvParserModule,
    GoogleDriveModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}