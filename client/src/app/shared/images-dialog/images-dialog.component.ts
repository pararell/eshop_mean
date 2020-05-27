import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-images-dialog',
  templateUrl: './images-dialog.component.html',
  styleUrls: ['./images-dialog.component.scss'],
})
export class ImagesDialogComponent implements OnInit {
  openImages = {};

  constructor(
    public dialogRef: MatDialogRef<ImagesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { index: number; images: string[] }
  ) {}

  ngOnInit(): void {
    this.openImages[this.data.index] = true;
  }

  prevImg(event: Event, i: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.openImages[i] = false;
    this.openImages[i - 1] = true;
  }

  nextImg(event: Event, i: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.openImages[i] = false;
    this.openImages[i + 1] = true;
  }

  onCloseImage(): void {
    this.dialogRef.close();
  }
}
