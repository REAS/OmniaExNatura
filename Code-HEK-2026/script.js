$(document).ready(function () {
  const LIVESTREAM_DURATION = 1 * 60 * 60 * 1000; // 1 HOURS
  const CHANNEL_ID = "UCJgRxPSOCWd4W41m6MuCkWw"; // REAL

  class Sketch {
    constructor(index, releaseDateTime) {
      this.index = index;
      this.div = $(`#header-${index}`); // jQuery object
      this.sketchDiv = $(`#sketchbox-${index}`); // jQuery object
      this.sketchFrame = $(`#sketch-${index}`); // jQuery object
      this.sketchPath = `sketches/sketch-${index}/index.html`;
      this.releaseDateTime = releaseDateTime;
      this.status = "locked"; // Whether or not it can be expanded
    }

    collapse() {
      this.sketchFrame.attr("src", "about:blank"); // Stop iframe with sandbox
      this.sketchDiv.hide();
      this.status = "unlocked-collapsed";
    }

    expand() {
      console.log(`expanding div ${this.index}`);
      if (this.status === "unlocked-collapsed") {
        console.log(`actually expanding div ${this.index}`);
        const src = this.isLive()
          ? `https://www.youtube.com/embed/live_stream?channel=${CHANNEL_ID}`
          : this.sketchPath;
        this.sketchFrame.attr("src", src);
        this.sketchDiv.show();
        this.status = "unlocked-expanded";
      }
    }

    unlock() {
      console.log(this.status);
      if (this.status === "locked") {
        this.status = "unlocked-collapsed";
        this.div.css("color", "#DE4D99");
        this.div.addClass("unlocked");
        this.sketchDiv.removeClass("locked");
        this.sketchDiv.hide();
        console.log(`unlocking sketch ${this.index}`);
      }
    }

    checkRelease() {
      return this.releaseDateTime < new Date();
    }

    isLive() {
      const now = new Date();
      return (
        now >= this.releaseDateTime &&
        now - this.releaseDateTime < LIVESTREAM_DURATION
      );
    }
  }

  class Gallery {
    constructor(sketches) {
      this.sketches = sketches;
      this.expanded = null;

      this.addListeners();
      this.checkLocks();
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
      let toExpand = 0;

      this.sketches.forEach((sketch, index) => {
        if (sketch.status === "locked" && sketch.checkRelease()) {
          sketch.unlock();
        }
        if (sketch.status != "locked") {
          toExpand = index;
        }
      });

      this.sketches[toExpand].expand();
      this.expanded = this.sketches[toExpand];
    }
  }

  const sketchData = [
    "2025-08-28T18:00:00+02:00",
    "2026-09-04T18:00:00+02:00",
    "2026-09-11T18:00:00+02:00",
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
});
