import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect } from "react";
import blackShadow from "./assets/black_shadow.png";
import fog1 from "./assets/fog_1.png";
import fog2 from "./assets/fog_2.png";
import fog3 from "./assets/fog_3.png";
import fog4 from "./assets/fog_4.png";
import fog5 from "./assets/fog_5.png";
import fog6 from "./assets/fog_6.png";
import fog7 from "./assets/fog_7.png";

import skyscraper1 from "./assets/skyscraper_1.png";
// import skyscraper2 from "./assets/skyscraper_2.png";
import skyscraper3 from "./assets/skyscraper_3.png";
import skyscraper4 from "./assets/skyscraper_4.png";
import skyscraper5 from "./assets/skyscraper_5.png";

import skyline1 from "./assets/skyline_1.png";
import skyline2 from "./assets/skyline_2.png";
import skyline3 from "./assets/skyline_3.png";
import skyline4 from "./assets/skyline_4.png";

import sunRays from "./assets/sun_rays.png";

const s = (shiftBy: any) => `-${50 + shiftBy}%`;

export default function ParallaxSkyline() {
  const x = useMotionValue(200);
  const y = useMotionValue(200);

  const springX = useSpring(x, { stiffness: 300, damping: 100 });
  const springY = useSpring(y, { stiffness: 300, damping: 100 });

  const { innerWidth: w, innerHeight: h } = window;

  const translateX1 = useTransform(springX, [0, w], [s(-8), s(8)]);
  const translateY1 = useTransform(springY, [0, h], ["-43%", "-55%"]);

  const translateX2 = useTransform(springX, [0, w], [s(-9.5), s(9.5)]);
  const translateY2 = useTransform(springY, [0, h], ["-40.5%", "-59.5%"]);

  const translateX3 = useTransform(springX, [0, w], [s(-9), s(9)]);
  const translateY3 = useTransform(springY, [0, h], [s(-9), s(9)]);

  const translateX4 = useTransform(springX, [0, w], [s(-8.5), s(8.5)]);
  const translateY4 = useTransform(springY, [0, h], [s(-8.5), s(8.5)]);

  const translateX5 = useTransform(springX, [0, w], [s(-8), s(8)]);
  const translateY5 = useTransform(springY, [0, h], [s(-8), s(8)]);

  const translateX6 = useTransform(springX, [0, w], [s(-7.5), s(7.5)]);
  const translateY6 = useTransform(springY, [0, h], [s(-7.5), s(7.5)]);

  const translateX7 = useTransform(springX, [0, w], [s(-7), s(7)]);
  const translateY7 = useTransform(springY, [0, h], [s(-7), s(7)]);

  const translateX8 = useTransform(springX, [0, w], [s(-6.5), s(6.5)]);
  const translateY8 = useTransform(springY, [0, h], [s(-6.5), s(6.5)]);

  const translateX9 = useTransform(springX, [0, w], [s(-6), s(6)]);
  const translateY9 = useTransform(springY, [0, h], [s(-6), s(6)]);

  const translateX10 = useTransform(springX, [0, w], [s(-5.5), s(5.5)]);
  const translateY10 = useTransform(springY, [0, h], [s(-5.5), s(5.5)]);

  const translateX11 = useTransform(springX, [0, w], [s(-5), s(5)]);
  const translateY11 = useTransform(springY, [0, h], [s(-5), s(5)]);

  const translateX12 = useTransform(springX, [0, w], [s(-4.5), s(4.5)]);
  const translateY12 = useTransform(springY, [0, h], [s(-4.5), s(4.5)]);

  const translateX13 = useTransform(springX, [0, w], [s(-4), s(4)]);
  const translateY13 = useTransform(springY, [0, h], [s(-4), s(4)]);

  const translateX14 = useTransform(springX, [0, w], [s(-3.5), s(3.5)]);
  const translateY14 = useTransform(springY, [0, h], [s(-3.5), s(3.5)]);

  const translateX15 = useTransform(springX, [0, w], [s(-3), s(3)]);
  const translateY15 = useTransform(springY, [0, h], [s(-3), s(3)]);

  const translateX16 = useTransform(springX, [0, w], [s(-2.5), s(2.5)]);
  const translateY16 = useTransform(springY, [0, h], [s(-2.5), s(2.5)]);

  const translateX17 = useTransform(springX, [0, w], [s(-2), s(2)]);
  const translateY17 = useTransform(springY, [0, h], [s(-2), s(2)]);

  const translateX18 = useTransform(springX, [0, w], [s(-1.5), s(1.5)]);
  const translateY18 = useTransform(springY, [0, h], [s(-1.5), s(1.5)]);

  const handleMouseMove = useCallback((event: any) => {
    const { pageX, pageY } = event;

    x.set(pageX);
    y.set(pageY);
  }, [x, y]);

  useEffect(() => {
    const motionEvent: (DeviceMotionEvent|void) = window.addEventListener(
      "devicemotion",
      function (event: DeviceMotionEvent) {
        const accX = event && event.accelerationIncludingGravity && event.accelerationIncludingGravity.x ? event.accelerationIncludingGravity.x : 1;
        const accY = event && event.accelerationIncludingGravity && event && event.accelerationIncludingGravity.y ? event.accelerationIncludingGravity.y * -1 : -1;
        const isLandscape = window.matchMedia(
          "(orientation: landscape)"
        ).matches;

        // adjust to replicate mouse movement values
        let pageX = (accX / 10) * w + w / 2;
        let pageY = (accY / 10) * h + h / 2;

        if (isLandscape) {
          // swap values
          [pageX, pageY] = [pageY, pageX];
        }

        x.set(pageX);
        y.set(pageY);
      }
    );

    if (motionEvent !== undefined) {
      return () => {
        window.removeEventListener("devicemotion", motionEvent);
      };
    }
    return;
  }, [h, w, x, y]);

  return (
    <>
      <div
        className="relative h-[60vh] w-screen select-none overflow-hidden md:h-screen"
        onMouseMove={handleMouseMove}
      >
        <motion.img
          // fetchpriority="high"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2 }}
          src={skyline1}
          className="absolute left-[60%] top-1/4 h-full w-full transform-gpu object-cover"
          style={{
            translateX: translateX1,
            translateY: translateY1,
            scale: 1.6,
          }}
        />

        <motion.img
          initial={{ y: 150 }}
          transition={{ ease: "easeOut", duration: 2 }}
          src={fog7}
          className="absolute left-1/2 top-1/2 h-full w-full transform-gpu object-cover"
          style={{
            translateX: translateX2,
            translateY: translateY2,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2 }}
          src={skyline3}
          className="absolute -bottom-[25%] left-[50%] h-1/2 transform-gpu"
          style={{
            translateX: translateX3,
            translateY: translateY3,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150 }}
          transition={{ ease: "easeOut", duration: 2 }}
          src={fog6}
          className="absolute left-1/2 top-1/2 h-full w-full transform-gpu object-cover opacity-30"
          style={{
            translateX: translateX4,
            translateY: translateY4,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2 }}
          src={skyscraper1}
          className="absolute -bottom-[25%] left-[15%] h-1/2 transform-gpu"
          style={{
            translateX: translateX5,
            translateY: translateY5,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150 }}
          transition={{ ease: "easeOut", duration: 2 }}
          src={fog5}
          className="absolute left-1/2 top-1/2 h-full w-full transform-gpu object-cover opacity-10"
          style={{
            translateX: translateX7,
            translateY: translateY7,
            scale: 1.5,
          }}
        />

        {/* <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2 }}
          src={skyscraper4}
          className="absolute -bottom-[30%] left-[65%] h-1/2 transform-gpu"
          style={{
            translateX: translateX8,
            translateY: translateY8,
            scale: 1.5,
          }}
        /> */}

        <div className="text-container absolute left-0 top-0 flex h-full w-full select-all flex-col items-center justify-center pb-[25vw] text-white md:pb-[8vw]">
        <motion.h1
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ease: "easeOut", duration: 2, delay: 1 }}
            className="-mt-[5vw] text-[9vw] font-[700] uppercase tracking-wider"
          >
            SKYLINE
          </motion.h1>
          
          <motion.h4
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ease: "easeOut", duration: 2, delay: 1 }}
            className="text-[2vw] font-[200] uppercase"
          >
            Advanced Training Services
          </motion.h4>

          
        </div>

        <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={skyline2}
          className="absolute -bottom-[25%] right-[6%] h-[60%] scale-150 transform-gpu"
          style={{
            translateX: translateX9,
            translateY: translateY9,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={fog4}
          className="absolute left-1/2 top-1/2 h-full w-full transform-gpu object-cover opacity-30"
          style={{
            translateX: translateX10,
            translateY: translateY10,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={skyscraper3}
          className="absolute -bottom-[40%] left-[35%] h-[46%] scale-150 transform-gpu"
          style={{
            translateX: translateX11,
            translateY: translateY11,
            scale: 1.7,
          }}
        />

        <motion.img
          initial={{ y: 150 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={fog3}
          className="absolute left-1/2 top-1/2 h-full w-full transform-gpu object-cover opacity-30"
          style={{
            translateX: translateX12,
            translateY: translateY12,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={skyscraper4}
          className="absolute -bottom-[35%] left-[20%] h-[46%] scale-150 transform-gpu"
          style={{
            translateX: translateX13,
            translateY: translateY13,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={skyscraper5}
          className="absolute -bottom-[15%] right-[-25%] h-[46%] scale-150 transform-gpu"
          style={{
            translateX: translateX14,
            translateY: translateY14,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={fog2}
          className="absolute left-1/2 top-1/2 h-full w-full transform-gpu object-cover opacity-10"
          style={{
            translateX: translateX15,
            translateY: translateY15,
            scale: 1.5,
          }}
        />

        <motion.img
          initial={{ y: 150, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={skyline4}
          className="absolute -bottom-[20%] left-[5%] h-[60%] scale-150 transform-gpu"
          style={{
            translateX: translateX17,
            translateY: translateY17,
            scale: 1.8,
          }}
        />

        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={sunRays}
          className="absolute top-0 h-full w-full transform-gpu object-cover opacity-70"
        />

        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={blackShadow}
          className="absolute top-0 h-full w-full transform-gpu object-cover"
        />

        <motion.img
          initial={{ y: 150 }}
          transition={{ ease: "easeOut", duration: 2, delay: 0 }}
          src={fog1}
          className="absolute left-1/2 top-1/2 h-full w-full transform-gpu object-cover opacity-30"
          style={{
            translateX: translateX18,
            translateY: translateY18,
            scale: 1.5,
          }}
        />

        <div
          className="absolute left-0 top-0 h-full w-full"
          style={{
            boxShadow: "inset 0px 0px 85px rgba(0,0,0,0.4)",
          }}
        ></div>
      </div>

      <footer className="absolute bottom-0 left-1/2 flex w-full -translate-x-1/2 flex-col flex-wrap justify-center gap-3 rounded-lg p-4 md:flex-row md:justify-end">
        <p className="alert bg-opacity-30 text-center text-sm md:hidden">
          View on desktop for better experience
        </p>
      </footer>
    </>
  );
};