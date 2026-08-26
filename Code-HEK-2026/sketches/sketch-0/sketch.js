let numElements = 900;

let minRadius = 20;
let maxRadius = 50;

//let img;

let elements;
let refreshIndex = 0;

let cblack;
let cgray;
let cgreen;
let ctan;

function preload() {
  img = loadImage("data/sketch-01-posterize-5.png");
}

function setup() {
  createCanvas(1800, 900);
  //createCanvas(windowWidth, windowHeight);

  cblack = color(0, 0, 0);
  cgray = color(99, 112, 104);
  cgreen = color(184, 186, 93);
  ctan = color(201, 210, 194);

  colorMode(RGB, 1.0);
  frameRate(30);
  noCursor();

  elements = [];

  background(0.5);
  refreshIndex = 0;
  addElement();
}

function addElement() {
  let nx = random(0, width);
  let ny = random(0, height);
  elements.push(new E1(
    elements.length,
    elements
  ));
}

function draw() {  
  if (elements.length < numElements && frameCount % 5 == 0) {
    addElement();
  }

  for (let i = 0; i < elements.length; i++) {
    elements[i].check();
  }

  //image(img, 0, 0, width, height);
}

function keyPressed() {
  if (key === ' ') {
    saveCanvas("HEK-01-04-" + nf(frameCount, 6), "png");
  }
}

class E1 {

  constructor(num, elements) {

    this.defaultColor = random(0, 1);

    this.alpha = 0;
    this.destroyed = false;
    this.dying = false;

    this.expiration = random(5000, 15000);
    this.birthTime = 0;

    // Location and radius set in birth()
    this.x = this.newx = 0;
    this.y = this.newy = 0;
    this.r = 0;

    this.id = num;
    this.others = elements;

    this.inc = 1.0;
    this.angle = random(0, TWO_PI);

    this.type = 0;

    this.birth();
  }

  birth() {
    this.setRadius(random(minRadius, maxRadius));
    this.birthTime = millis() + random(5000, 15000);
    this.dying = false;
    this.destroyed = false;
    //this.alpha = min(this.alpha + 0.01, 0.2);
    this.alpha = 0.0;

    //while(this.type == 0) {
      this.x = this.newx = random(0, width);
      this.y = this.newy = random(0, height);
      let color = img.get(this.x, this.y);
      this.color = color;
      //print("Color: " + color);
      if ([cblack, cgray].some(target =>
        this.color[0] === target.levels[0] &&
        this.color[1] === target.levels[1] &&
        this.color[2] === target.levels[2])) {
        this.type = 1;
        print("Type 1");
      } else  if ([cgreen].some(target =>
        this.color[0] === target.levels[0] &&
        this.color[1] === target.levels[1] &&
        this.color[2] === target.levels[2])) {
        this.type = 3;
        print("Type 3");
      } else {
        this.type = 2;
      }
    //}
  }

  death() {
    this.dying = true;
  }

  getCenterX() {
    return this.newx;
  }

  getCenterY() {
    return this.newy;
  }

  setRadius(rin) {
    this.r = rin;
    this.cellwidth = this.r*2;
  }

  move(a, r) {
    this.newx = this.newx + cos(a)*r;
    this.newy = this.newy + sin(a)*r;
  }

  check() {

    if (this.type == 2) {
      this.drawCenter();
    } else if (this.type == 3) {
      this.drawPerimeter();
    }

    if (millis() > this.birthTime + this.expiration) {
      this.death();
    }
    
    if (this.destroyed) {
      this.birth();
    }

    if (this.dying) {
      this.alpha = max(this.alpha - 0.002, 0);
      if (this.alpha <= 0) {
        this.destroyed = true;
        return;
      }
    } else {
      this.alpha = min(this.alpha + 0.002, 0.2);
    }

    // Increase the angle when touching another circle
    // Increment position with numbers between -1 and 1
    // Modulate the speed based on size of circle
    this.newx += cos(this.angle);
    this.newy += sin(this.angle);


    // Interpolate X
    let tempx = this.newx - this.x;
    if (abs(tempx) > 0.1) {
      this.x += tempx/40.0;
    }

    // Interpolate Y
    let tempy = this.newy - this.y;
    if (abs(tempy) > 0.1) {
      this.y += tempy/40.0;
    }

    this.over = 0;

    for (let i = 0; i < this.others.length; i++) {
      if (i != this.id && !this.others[i].destroyed) {
        let dx = this.others[i].getCenterX() - this.getCenterX();
        let dy = this.others[i].getCenterY() - this.getCenterY();
        let rerr = this.others[i].cellwidth/2 + this.cellwidth/2 + 1.0;
        let rr = this.others[i].cellwidth/2 + this.cellwidth/2;
        let diff = dx*dx + dy*dy;

        // If overlap
        if (diff < (rr*rr)) {
          let rA = atan2(dy, dx);
          // if (rA == 0) {
          //   rA = random(1.0);
          // }

          this.others[i].move(rA, this.inc);
          this.move(rA + PI, this.inc);
          
          if (this.type == 1) {
            let tempd = dist(this.x, this.y, this.others[i].x, this.others[i].y);
            let s = map(tempd, minRadius*2, maxRadius*2, 0.0, 1.0);
            stroke(s, this.alpha);
            line(this.x, this.y, this.others[i].x, this.others[i].y);
          }
        }

        if (diff < rerr*rerr) {
          this.over++; // Count the number of elements touching
          if (this.over > 3) {
            this.over = 3;
          }
        }
      }
    }

    // Turn if touching another
    if (this.over > 0) { 
      let inc = this.over * ((1.0-(this.r/70.0)) / 6.0);
      this.angle += inc;
    }
  }

  drawCenter(){
    stroke(this.defaultColor, this.alpha*2);
    point(this.x, this.y);
  }

  drawPerimeter(){
    stroke(this.defaultColor, this.alpha/2);
    noFill();
    ellipse(this.x, this.y, this.r*2, this.r*2);
  }
}