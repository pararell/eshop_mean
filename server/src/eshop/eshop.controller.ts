import {
    Controller,
    Body,
    Session,
    Post,
    Get,
  } from '@nestjs/common';
import { EshopService } from './eshop.service';
import { ContactDto } from './dto/contact.dto';


  @Controller('api/eshop')
  export class EshopController {
    constructor(private eshopService: EshopService) {}

    @Get('/config')
    getConfig(): {config: string} {
       return {config: Buffer.from(JSON.stringify(Object.keys(process.env)
        .filter(key => key.includes('FE_'))
        .reduce((prev, curr) => ({...prev, [curr]: process.env[curr]}), {}))
      ).toString('base64')};
    }

    @Post('/contact')
    sendContact(@Body() contactDto: ContactDto, @Session() session): void {
       this.eshopService.sendContact(contactDto, session.cart);
    }


  }
