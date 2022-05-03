export class Images {
  all: string[];

  constructor(previousImages: { all: string[] }) {
    this.all = previousImages.all || [];
  }

  add = function (newImage: string): void {
    const found = this.all.filter((image) => image === newImage).length;
    if (!found) {
      this.all = [...this.all, newImage];
    }
  };

  remove = function (newImage: string): void {
    this.all = this.all.filter((image) => image !== newImage);
  };
}
