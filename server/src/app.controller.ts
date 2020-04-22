import { Get, Res, Controller } from "@nestjs/common";
import { join } from 'path';


@Controller()
export class AppController {
  @Get()
  sendApplication(@Res() res) {
    res.sendFile(join(process.cwd(), 'dist/eshop/browser'));
  }
}