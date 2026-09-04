import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CvParserService } from './cv-parser.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service'
import { GoogleOauthService } from '../google-oauth/google-oauth.service';

@Controller('cv-parser')
export class CvParserController {
  constructor(
    private readonly cvParserService: CvParserService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly googleOauthService: GoogleOauthService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCv(
    @UploadedFile() file: any,
    @Body('eventId') eventId: string,
  ) {
    if (!file) {
      throw new BadRequestException('CV file is required');
    }

    if (!eventId) {
      throw new BadRequestException(
        'eventId is required in form-data',
      );
    }

    const tokens = this.googleOauthService.getTokens();

    if (!tokens) {
      throw new BadRequestException(
        'Google account not connected yet — visit /auth/google first',
      );
    }

    const text = await this.cvParserService.extractTextFromPdf(
      file.buffer,
    );

    const info = this.cvParserService.extractCandidateInfo(text);
    console.log('EXTRACTED CANDIDATE INFO:', info);

    if (!info.name || !info.phone) {
      throw new BadRequestException(
        'Could not extract candidate name or phone from CV',
      );
    }

    const rowNumber =
      await this.googleSheetsService.findRowByEventId(
        tokens.access_token,
        tokens.refresh_token,
        eventId,
      );

    if (!rowNumber) {
      return {
        info,
        message:
          'No matching row found for this eventId in the sheet',
      };
    }

    await this.googleSheetsService.updateCandidateInfo(
      tokens.access_token,
      tokens.refresh_token,
      rowNumber,
      info.name,
      info.phone,
    );

    return {
      info,
      message: `Sheet row ${rowNumber} updated successfully`,
    };
  }
}