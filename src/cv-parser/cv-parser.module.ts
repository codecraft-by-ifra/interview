import { Module, forwardRef } from '@nestjs/common';
import { CvParserController } from './cv-parser.controller';
import { CvParserService } from './cv-parser.service';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { GoogleOauthModule } from '../google-oauth/google-oauth.module';

@Module({
  imports: [
    GoogleSheetsModule,
    forwardRef(() => GoogleOauthModule),
  ],
  controllers: [CvParserController],
  providers: [CvParserService],
  exports: [CvParserService],
})
export class CvParserModule {}