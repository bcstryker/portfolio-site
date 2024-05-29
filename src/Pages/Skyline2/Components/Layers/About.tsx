import { ParallaxLayer } from "@react-spring/parallax";
import React from "react";
import { url } from "../../utils";

interface AboutProps {
  parallax: any;
}

const About: React.FC<AboutProps> = ({ parallax }) => {
  return (
    <>
      <ParallaxLayer
        offset={-0.9}
        speed={-0.3}
        style={{
          backgroundSize: "80%",
          backgroundPosition: "center",
          backgroundImage: url("clients", true),
        }}
      />
      <ParallaxLayer
        offset={-1.6}
        speed={-0.4}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img alt="tmp" src={url("clients-main")} style={{ width: "40%" }} />
      </ParallaxLayer>
    </>
  );
};

export default About;
