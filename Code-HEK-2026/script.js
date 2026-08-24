$(document).ready(function () {
  const LIVESTREAM_DURATION = 2 * 60 * 60 * 1000; // 2 HOURS
  const TEST_CHANNEL_ID_LIVE = "UCN_u5w69V9wUZYG8WeJWuNg";
  const TEST_CHANNEL_ID_NOTLIVE = "UC1rIOwTqDuWkFj87HZYRFOg";

  class Sketch {
    constructor(index, releaseDateTime) {
      this.index = index;
      this.div = $(`#header-${index}`); // jQuery object
      this.sketchDiv = $(`#sketchbox-${index}`); // jQuery object
      this.sketchFrame = $(`#sketch-${index}`); // jQuery object
      this.sketchPath = `sketches/sketch-${index}/index.html`;
      this.releaseDateTime = releaseDateTime;
      this.status = "locked"; // Whether or not it can be expanded

      if (this.index === 1) {
        this.sketchPath = `https://www.youtube.com/embed/live_stream?channel=${TEST_CHANNEL_ID_LIVE}`;
      }
    }

    collapse() {
      this.sketchFrame.attr("src", "about: blank"); // Stop iframe with sandbox
      this.sketchDiv.hide();
      this.status = "unlocked-collapsed";
    }

    expand() {
      console.log(`expanding div ${this.index}`);
      if (this.status === "unlocked-collapsed") {
        console.log(`actually expanding div ${this.index}`);
        this.sketchFrame.attr("src", this.sketchPath);
        this.sketchDiv.show();
        this.status = "unlocked-expanded";
      }
    }

    unlock() {
      console.log(this.status);
      if (this.status === "locked") {
        this.status = "unlocked-collapsed";
        this.div.addClass("unlocked");
        this.sketchDiv.removeClass("locked");
        this.sketchDiv.hide();
        console.log(`unlocking sketch ${this.index}`);
      }
    }

    checkRelease() {
      return this.releaseDateTime < new Date();
    }
  }

  class Gallery {
    constructor(sketches) {
      this.sketches = sketches;
      this.expanded = null;

      this.addListeners();
      this.checkLocks();
      this.sketches[0].expand();
      this.expanded = this.sketches[0];
    }

    addListeners() {
      $(document).on("click", ".header", (e) => {
        const index = $(e.currentTarget).data("index");
        this.handleHeaderClick(index);
      });
    }

    handleHeaderClick(index) {
      console.log(`div ${index} clicked`);
      const sketch = this.sketches[index];
      if (!sketch || sketch.status === "locked" || sketch === this.expanded)
        return;

      this.expanded.collapse();
      sketch.expand();
      this.expanded = sketch;
    }

    checkLocks() {
      this.sketches.forEach((sketch) => {
        if (sketch.status === "locked" && sketch.checkRelease()) {
          sketch.unlock();
        }
      });
    }
  }

  // const sketchData = [
  //   "2026-08-28T18:00:00+02:00",
  //   "2026-09-04T18:00:00+02:00",
  //   "2026-09-11T18:00:00+02:00",
  //   "2026-09-18T18:00:00+02:00",
  //   "2026-09-25T18:00:00+02:00",
  //   "2026-10-02T18:00:00+02:00",
  //   "2026-10-09T18:00:00+02:00",
  //   "2026-10-16T18:00:00+02:00",
  //   "2026-10-23T18:00:00+02:00",
  // ];

  const sketchData = [
    "2025-08-28T18:00:00+02:00",
    "2025-09-04T18:00:00+02:00",
    "2025-09-11T18:00:00+02:00",
    "2026-09-18T18:00:00+02:00",
    "2026-09-25T18:00:00+02:00",
    "2026-10-02T18:00:00+02:00",
    "2026-10-09T18:00:00+02:00",
    "2026-10-16T18:00:00+02:00",
    "2026-10-23T18:00:00+02:00",
  ];

  const sketches = sketchData.map(
    (data, index) => new Sketch(index, new Date(data)),
  );

  const gallery = new Gallery(sketches);
  gallery.checkLocks();
});
