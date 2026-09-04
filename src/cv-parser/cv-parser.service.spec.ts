import { Test, TestingModule } from '@nestjs/testing';
import { CvParserService } from './cv-parser.service';

describe('CvParserService', () => {
  let service: CvParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CvParserService],
    }).compile();

    service = module.get<CvParserService>(CvParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
