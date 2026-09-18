let numElements = 600;

let minRadius = 24;
let maxRadius = 54;

let img1, img2;

let elements;
let refreshIndex = 0;

let cblack;
let cgray;
let cgreen;
let ctan;

function preload() {
  img1 = loadImage("data/sketch-03-02-posterized.png");
  img2 = loadImage("data/sketch-03-02.png");
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

  background(226);
  refreshIndex = 0;
  addElement();
}

function addElement() {
  let nx = random(0, width);
  let ny = random(0, height);
  elements.push(new E3(
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

  for (let i = 0; i < elements.length; i++) {
    elements[i].drawIntersectionMarkers();
  }

  //image(img, 0, 0, width, height);

  //filter(GRAY);
}

function keyPressed() {
  if (key === ' ') {
    saveCanvas("HEK-03-03-" + nf(frameCount, 6), "png");
  }
}

class E3 {

  static INITIAL_ALPHA = 20.0;
  static MIN_LIFESPAN_SECONDS = 5;
  static MAX_LIFESPAN_SECONDS = 20;
  static FRAME_RATE = 30;
  static INTERSECTION_GROWTH_SECONDS = 5.0;

  constructor(num, elements) {

    this.defaultColor = random(0, 1);

    this.alpha = 0;
    this.destroyed = false;
    this.dying = false;

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
    this.intersectionMarkers = new Map();

    this.birth();
  }

  birth() {
    this.setRadius(random(minRadius, maxRadius));
    this.dying = false;
    this.destroyed = false;
    this.lifespanSeconds = random(E3.MIN_LIFESPAN_SECONDS, E3.MAX_LIFESPAN_SECONDS);
    this.DECAY_MULTIPLIER = E3.INITIAL_ALPHA / (this.lifespanSeconds * E3.FRAME_RATE);
    this.alpha = E3.INITIAL_ALPHA;

      this.x = this.newx = random(0, width);
      this.y = this.newy = random(0, height);
      let colorfalse = img1.get(this.x, this.y);
      let colorreal = img2.get(this.x, this.y);
      this.color = colorfalse;
      if (random(0, 1) > 0.33) {
        this.colorreal = img2.get(this.x, this.y);
      } 
      this.elementcolor = colorreal;
      this.elementr = this.elementcolor[0];
      this.elementg = this.elementcolor[1];
      this.elementb = this.elementcolor[2];
      //print("Color: " + color);
      if ([cred].some(target =>
        this.color[0] === target.levels[0] &&
        this.color[1] === target.levels[1] &&
        this.color[2] === target.levels[2])) {
        this.type = 5; //1; //2;
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
    } else if (this.type == 5) {
      this.drawCenter();
      this.drawAngle();
      //this.drawPerimeter();
    }

    if (this.destroyed) {
      this.birth();
    }

    this.alpha = max(this.alpha - this.DECAY_MULTIPLIER, 0);
    if (this.alpha <= 0) {
      this.death();
      this.destroyed = true;
      return;
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

    for (let marker of this.intersectionMarkers.values()) {
      marker.active = false;
    }

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

          this.others[i].move(rA, this.inc);
          this.move(rA + PI, this.inc);
          
          if (this.type == 1) {
            strokeWeight(1);
            let tempd = dist(this.x, this.y, this.others[i].x, this.others[i].y);
            let gray = map(tempd, minRadius*2, maxRadius*2, 0, 255);
            stroke(gray, gray, gray, this.alpha/2);
            line(this.x, this.y, this.others[i].x, this.others[i].y);
          }
        }

        if (diff < rerr*rerr) {
          this.over++; // Count the number of elements touching
          if (this.over > 3) {
            this.over = 3;
          }
        }

        if (this.id < this.others[i].id) {
          let intersectionPoints = this.getIntersectionPoints(this.others[i]);
          let marker = this.intersectionMarkers.get(this.others[i].id);

          if (!marker) {
            marker = {
              active: false,
              points: [],
              progress: 0,
              maxDiameter: 0
            };
            this.intersectionMarkers.set(this.others[i].id, marker);
          }

          if (intersectionPoints) {
            marker.active = true;
            marker.points = intersectionPoints;
            marker.maxDiameter = min(this.r, this.others[i].r) * 0.5;
          }
        }
      }
    }

    for (let marker of this.intersectionMarkers.values()) {
      let growthStep = 1.0 / (E3.INTERSECTION_GROWTH_SECONDS * E3.FRAME_RATE);
      marker.progress = constrain(marker.progress + (marker.active ? growthStep : -growthStep), 0, 1);
    }

    // Turn if touching another
    // if (this.over > 0) { 
    //   let inc = this.over * ((1.0-(this.r/70.0)) / 6.0);
    //   this.angle += inc / 20.0; // New 11 Sep 2026 to turn less when touching more than one
    // }
  }

  getIntersectionPoints(other) {
    let dx = other.x - this.x;
    let dy = other.y - this.y;
    let distance = sqrt(dx * dx + dy * dy);

    if (distance === 0 || distance >= this.r + other.r || distance <= abs(this.r - other.r)) {
      return null;
    }

    let along = (this.r * this.r - other.r * other.r + distance * distance) / (2 * distance);
    let height = sqrt(max(this.r * this.r - along * along, 0));
    let baseX = this.x + dx * along / distance;
    let baseY = this.y + dy * along / distance;
    let offsetX = -dy * height / distance;
    let offsetY = dx * height / distance;

    return [
      { x: baseX + offsetX, y: baseY + offsetY },
      { x: baseX - offsetX, y: baseY - offsetY }
    ];
  }

  drawIntersectionMarkers() {
    if (this.type == 4) {
      return;
    }

    noStroke();

    for (let [otherId, marker] of this.intersectionMarkers) {
      if (marker.progress <= 0 || marker.points.length === 0) {
        continue;
      }

      let other = this.others[otherId];
      let markerAlpha = min(min(this.alpha, other ? other.alpha : this.alpha) * 1.25, 255);
      let diameter = marker.maxDiameter * pow(marker.progress, 3);

      fill(this.elementr, this.elementg, this.elementb, markerAlpha);
      for (let point of marker.points) {
        ellipse(point.x, point.y, diameter, diameter);
      }
    }
  }

  drawCenter(){
    strokeWeight(1.5);
    stroke(this.elementr, this.elementg, this.elementb, this.alpha*4);
    point(this.x, this.y);
  }

  drawPerimeter(){
    strokeWeight(1);
    //stroke(this.elementr, this.elementg, this.elementb, this.alpha);
    stroke(226, this.alpha*0.5);
    noFill();
    ellipse(this.x, this.y, this.r, this.r);
  }

  drawAngle(){
    noStroke();
    fill(this.elementr, this.elementg, this.elementb, this.alpha);
    //fill(226, this.alpha*2);
    let nx = this.x + cos(this.angle) * this.r;
    let ny = this.y + sin(this.angle) * this.r;
    ellipse(nx, ny, 1.5, 1.5);
  }
}