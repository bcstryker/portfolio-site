import { ParallaxLayer } from "@react-spring/parallax";
import React from "react";

interface ServicesProps {
  parallax: any;
}

const Services: React.FC<ServicesProps> = ({ parallax }) => {
  return (
    <>
      <ParallaxLayer speed={1.4}>
        <img alt="engineering" src={"software-engineer.svg"} style={{ width: "40%", marginLeft: "20%" }} />
      </ParallaxLayer>
      {/* <ParallaxLayer offset={.5} speed={1} style={{ opacity: 0.6 }}>
        <img
          alt="tmp"
          src={url("cloud")}
          style={{ display: "block", width: "20%", marginLeft: "5%" }}
        />
        <img
          alt="tmp"
          src={url("cloud")}
          style={{ display: "block", width: "15%", marginLeft: "75%" }}
        />
      </ParallaxLayer> */}
      <ParallaxLayer offset={.2} speed={.8}>
        <img alt="iteration" src={"product-iteration.svg"} style={{ width: "35%", marginLeft: "50%" }} />
      </ParallaxLayer>
    </>
  );
};

export default Services;
