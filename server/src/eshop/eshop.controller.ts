import {
    Controller,
    Get,
    Post,
    Request,
    Body,
    Param,
    Delete,
    Patch,
    Query,
    UsePipes,
    ValidationPipe,
    ParseIntPipe,
    UseGuards,
    Session,
  } from '@nestjs/common';



  @Controller('api/eshop')
  export class EshopController {
    constructor() {}
  
    @Get('/contact')
    getCart(@Body() contact: any): any {
       return {};
    }


  }
  