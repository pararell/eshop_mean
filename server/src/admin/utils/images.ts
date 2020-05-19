export class Images {
  all: string[];

  constructor(previousImages) {
    this.all = previousImages.all || [];
  }

  add = function (newImage) {
    const found = this.all.filter((image) => image === newImage).length;
    if (!found) {
      this.all = [...this.all, newImage];
    }
  };

  remove = function (newImage) {
    this.all = this.all.filter((image) => image !== newImage);
  };
}
