import { describe, expect, it } from "vitest";
import { demoVideoSource } from "../src/components/landing/demo-video";

describe("demo video links", () => {
  it("accepts every common YouTube form", () => {
    const embed = { kind: "iframe", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1" };
    expect(demoVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual(embed);
    expect(demoVideoSource("https://youtu.be/dQw4w9WgXcQ?si=abc")).toEqual(embed);
    expect(demoVideoSource("https://youtube.com/shorts/dQw4w9WgXcQ")).toEqual(embed);
    expect(demoVideoSource("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toEqual(embed);
  });

  it("accepts Vimeo and video files", () => {
    expect(demoVideoSource("https://vimeo.com/123456789")).toEqual({ kind: "iframe", src: "https://player.vimeo.com/video/123456789?autoplay=1&dnt=1" });
    expect(demoVideoSource("/landing/demo.mp4")).toEqual({ kind: "file", src: "/landing/demo.mp4" });
  });

  it("falls back when no usable video is configured", () => {
    expect(demoVideoSource("")).toBeNull();
    expect(demoVideoSource("https://example.com/page")).toBeNull();
  });
});
