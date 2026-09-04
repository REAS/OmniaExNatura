let numElements = 1200;

let minRadius = 20;
let maxRadius = 44;

let img1, img2;

let elements;
let refreshIndex = 0;

let cblack;
let cgray;
let cgreen;
let ctan;

function preload() {
  img1 = loadImage("data/sketch-01-02-posterize-rgb.png");
}

function setup() {
  createCanvas(1800, 900);
  //createCanvas(windowWidth, windowHeight);

  cred = color(255, 0, 0);
  cgreen = color(0, 255, 0);
  cblue = color(0, 0, 255);
  cwhite = color(255, 255, 255);

  //colorMode(RGB, 1.0);
  frameRate(30);
  noCursor();

  elements = [];

  background(126);
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
  //translate(-width/2, -height/2);

  if (elements.length < numElements && frameCount % 1 == 0) {
    addElement();
  }

  for (let i = 0; i < elements.length; i++) {
    elements[i].check();
  }

  //image(img, 0, 0, width, height);

  //filter(GRAY);
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

    this.elementcolor;
    this.elementr;
    this.elementg;
    this.elementb;

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

      this.x = this.newx = random(0, width);
      this.y = this.newy = random(0, height);
      let colorfalse = img1.get(this.x, this.y);
      //let colorreal = img2.get(this.x, this.y);
      //let colorreal = img2.get(random(0, width), random(0, height));
      //if (random(0, 1) > 0.25) {
        //colorreal = img2.get(this.x, this.y);
      //} 
      this.color = colorfalse;
      // this.elementcolor = colorreal;
      this.elementcolor = random(0, 255);
      // this.elementr = this.elementcolor[0];
      // this.elementg = this.elementcolor[1];
      // this.elementb = this.elementcolor[2];
      //print("Color: " + color);
      if ([cred].some(target =>
        this.color[0] === target.levels[0] &&
        this.color[1] === target.levels[1] &&
        this.color[2] === target.levels[2])) {
        this.type = 1; //1; //2;
        //print("Type 1");
      } else if ([cgreen].some(target =>
        this.color[0] === target.levels[0] &&
        this.color[1] === target.levels[1] &&
        this.color[2] === target.levels[2])) {
        this.type = 2; //2; //3;
        //print("Type 3");
      } else if ([cblue].some(target =>
        this.color[0] === target.levels[0] &&
        this.color[1] === target.levels[1] &&
        this.color[2] === target.levels[2])) {
        this.type = 3; //3; //1;
      } else {
        this.type = 4;
      }

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
    } else if (this.type == 4) {
      this.drawAngle();
    }

    if (millis() > this.birthTime + this.expiration) {
      this.death();
    }
    
    if (this.destroyed) {
      this.birth();
    }

    if (this.dying) {
      this.alpha = max(this.alpha - 1, 0);
      if (this.alpha <= 0) {
        this.destroyed = true;
        return;
      }
    }
    // } else {
    //   this.alpha = min(this.alpha + 4, 0);
    // }

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

          if (!this.dying) {
            this.alpha = min(this.alpha + 2, 0);
            this.alpha = max(this.alpha, 50);
          }


          let rA = atan2(dy, dx);
          // if (rA == 0) {
          //   rA = random(1.0);
          // }

          this.others[i].move(rA, this.inc);
          this.move(rA + PI, this.inc);
          
          if (this.type == 1) {
            strokeWeight(1);
            let tempd = dist(this.x, this.y, this.others[i].x, this.others[i].y);
            let gray = map(tempd, minRadius*2, maxRadius*2, 0, 255);
            //stroke(this.elementColor, this.alpha);
            stroke(gray, gray, gray, this.alpha/2); //this.alpha*2);
            //let s = map(tempd, minRadius*2, maxRadius*2, 33, 0);
            //stroke(this.elementColor, this.alpha);
            //stroke(this.elementr, this.elementg, this.elementb, s); //this.alpha*2);
            //stroke(this.elementr, this.elementg, this.elementb, this.alpha); //this.alpha*2);
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
    //stroke(this.elementColor, this.alpha*2);
    //stroke(this.elementColor, 5);
    strokeWeight(1.5);
    //stroke(this.elementr, this.elementg, this.elementb, this.alpha); //this.alpha*2);
    //stroke(0.0, 0.0, 0.0, this.alpha*0.5);
    stroke(this.elementcolor, this.elementcolor, this.elementcolor, this.alpha*2);
    point(this.x, this.y);
  }

  drawPerimeter(){
    strokeWeight(1.5);
    //stroke(this.elementColor, this.alpha/2);
    //stroke(255, 255, 255, this.alpha*0.5);
    stroke(this.elementcolor, this.elementcolor, this.elementcolor, this.alpha*0.25);
    //stroke(this.elementr, this.elementg, this.elementb, this.alpha*0.5); //, this.alpha/2);
    noFill();
    ellipse(this.x, this.y, this.r * 0.66, this.r * 0.66);
  }

  drawAngle(){
    //strokeWeight(1);
    noStroke();
    //stroke(this.elementColor, this.alpha/2);
    //fill(this.elementr, this.elementg, this.elementb, this.alpha*0.5); //, this.alpha/2);
    //fill(0, 0, 0, this.alpha*0.5);
    fill(this.elementcolor, this.elementcolor, this.elementcolor, this.alpha*0.33);
    let nx = this.x + cos(this.angle) * this.r * 0.66;
    let ny = this.y + sin(this.angle) * this.r * 0.66;
    ellipse(nx, ny, 3, 3);
  }
}