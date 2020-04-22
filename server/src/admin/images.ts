
export class Images {
    all : string[];

  constructor(previousImages) {
    this.all = previousImages.images || [];
  }

  add = function(newImage) {
      const found = !!this.all.filter(image => image === newImage).length;
      if (!found) {
        this.all.push(newImage);
      }
  };

  remove = function(newImage) {
    this.all = this.all.filter(image => image !== newImage);
  }
}




  