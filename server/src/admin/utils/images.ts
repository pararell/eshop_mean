export class Images {
  all: string[];

  constructor(previousImages: { all: string[] }) {
    this.all = previousImages.all || [];
  }

  add = function (this: Images, newImage: string): void {
    const found = this.all.filter((image) => image === newImage).length;
    if (!found) {
      this.all = [...this.all, newImage];
    }
  };

  remove = function (this: Images, newImage: string): void {
    this.all = this.all.filter((image) => image !== newImage);
  };
}
