import { Pipe, PipeTransform } from '@angular/core';



@Pipe({
  name : 'priceFormat',
  pure : true
})
export class PriceFormatPipe implements PipeTransform {

  transform(value: number): string {
    const price = value.toFixed(0);
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

}
