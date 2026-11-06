"use client";

import {useEffect, useState} from "react";
import styles from "./lobby.module.css";

// A scannable copy of the invite link, drawn in the browser (the link never leaves this page).
export default function InviteQr({url}: {url: string}) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let active = true;
    void import("qrcode").then(({default: QRCode}) => QRCode.toDataURL(url, {width: 240, margin: 2, errorCorrectionLevel: "M"}))
      .then((data) => {if (active) setImage(data);})
      .catch(() => {if (active) setImage("");});
    return () => {active = false;};
  }, [url]);
  return <details className={styles.inviteQr}>
    <summary>Show QR code</summary>
    {image ? <img src={image} width={240} height={240} alt="QR code for the invite link to this party" /> : <p className={styles.small}>Making QR code…</p>}
    <p className={styles.small}>Scanning opens the invite link on that device and joins it to this party.</p>
  </details>;
}
