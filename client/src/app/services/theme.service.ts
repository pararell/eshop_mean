
import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import tinycolor from "tinycolor2";

export interface Color {
  name: string;
  hex: string;
  darkContrast: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  constructor(
    @Inject(DOCUMENT)
    private document: Document
    ) {}


  setCSSVariable(color, type: string): void {
    this.document.documentElement.style.setProperty(`--${type}`, color);
  }

  setThemeColor = (themeColor, type: string): void => {
    const colorPalette = this.computeColors(themeColor);

    for (const color of colorPalette) {
      const key1 = `--${type}-${color.name}`;
      const value1 = color.hex;
      const key2 = `--${type}-contrast-${color.name}`;
      const value2 = color.darkContrast ? 'rgba(0,0,0, 0.87)' : 'rgba(255,255,255, 0.8)';
      this.document.documentElement.style.setProperty(key1, value1);
      this.document.documentElement.style.setProperty(key2, value2);
    }
  }

  private computeColors(hex: string): Color[] {
    return [
      this.getColorObject(tinycolor(hex).lighten(52), '50'),
      this.getColorObject(tinycolor(hex).lighten(37), '100'),
      this.getColorObject(tinycolor(hex).lighten(26), '200'),
      this.getColorObject(tinycolor(hex).lighten(12), '300'),
      this.getColorObject(tinycolor(hex).lighten(6), '400'),
      this.getColorObject(tinycolor(hex), '500'),
      this.getColorObject(tinycolor(hex).darken(6), '600'),
      this.getColorObject(tinycolor(hex).darken(12), '700'),
      this.getColorObject(tinycolor(hex).darken(18), '800'),
      this.getColorObject(tinycolor(hex).darken(24), '900'),
      this.getColorObject(tinycolor(hex).lighten(50).saturate(30), 'A100'),
      this.getColorObject(tinycolor(hex).lighten(30).saturate(30), 'A200'),
      this.getColorObject(tinycolor(hex).lighten(10).saturate(15), 'A400'),
      this.getColorObject(tinycolor(hex).lighten(5).saturate(5), 'A700')
    ];
  }

  private getColorObject(value, name): Color {
    const c = tinycolor(value);
    return {
      name: name,
      hex: c.toHexString(),
      darkContrast: c.isLight()
    };
  }

}
