let angle = 0;
let scp;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  scp = await loadFont("../../public/Source_Code_Pro.woff2");
}

function draw() {
  background("#333333");
  fill("#CCCCCC");
  textFont(scp);
  textSize(24);
  textAlign(LEFT, CENTER);
  text(
    "This sketch is still in progress and will appear here when it’s ready.",
    100,
    450,
  );
}
