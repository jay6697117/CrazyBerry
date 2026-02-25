export class GridTile {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.soilState = 'grass';
    this.cropId = null;
    this.wateredToday = false;
  }
}
