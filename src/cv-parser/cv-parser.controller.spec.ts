import { Test, TestingModule } from '@nestjs/testing';
import { CvParserController } from './cv-parser.controller';

describe('CvParserController', () => {
  let controller: CvParserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CvParserController],
    }).compile();

    controller = module.get<CvParserController>(CvParserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
