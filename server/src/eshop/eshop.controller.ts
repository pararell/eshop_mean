import {
    Controller,
    Body,
    Session,
    Post,
  } from '@nestjs/common';
import { EshopService } from './eshop.service';
import { ContactDto } from './dto/contact.dto';



  @Controller('api/eshop')
  export class EshopController {
    constructor(private eshopService: EshopService) {}

    @Post('/contact')
    sendContact(@Body() contactDto: ContactDto, @Session() session): void {
       this.eshopService.sendContact(contactDto, session.cart);
    }


  }
