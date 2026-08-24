let angle = 0;

function setup() {
  createCanvas(1780, 400);
}

function draw() {
  background(220);
  fill(0, 255, 0);
  circle(100, 100 + 50 * sin(angle), 100);
  angle += 0.05;
}
