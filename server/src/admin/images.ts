
export class Images {
    all : string[];

  constructor(previousImages) {
    this.all = previousImages.images || [];
  }

  add = function(newImage) {
      console.log(newImage, 'newImage',  this.all)
      const found = !!this.all.filter(image => image === newImage).length;
      if (!found) {
        this.all.push(newImage);
      }
  };

  remove = function(newImage) {
    this.all = this.all.filter(image => image !== newImage);
  }
}




  