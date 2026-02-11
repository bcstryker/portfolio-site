"use client";

import {useEffect, useState} from "react";

type EmailActionsProps = {
  email: string;
  label: string;
  className?: string;
  variant?: "button" | "link";
  helperPlacement?: "below" | "right";
  helperOrientation?: "column" | "row";
};

export default function EmailActions({
  email,
  label,
  className = "",
  variant = "button",
  helperPlacement = "below",
  helperOrientation = "column",
}: EmailActionsProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleMailto = () => {
    window.location.href = `mailto:${email}`;
    setShowOptions(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;

  const helperPosition =
    helperPlacement === "right" ? "left-full top-1/2 ml-3 -translate-y-1/2" : "left-1/2 top-full mt-2 -translate-x-1/2";
  const helperLayout = helperOrientation === "row" ? "flex-row items-center" : "flex-col items-center";
  const helperPadding = helperOrientation === "row" ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className="relative inline-flex flex-col items-start gap-2">
      {variant === "button" ? (
        <button type="button" onClick={handleMailto} className={className}>
          {label}
        </button>
      ) : (
        <button type="button" onClick={handleMailto} className={className}>
          {label}
        </button>
      )}
      {showOptions ? (
        <div
          className={`absolute z-10 flex ${helperLayout} gap-2 whitespace-nowrap rounded-2xl border border-gray-200 bg-white ${helperPadding} text-xs text-gray-600 shadow-sm ${helperPosition}`}
        >
          <a
            href={gmailHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-700"
          >
            Open Gmail
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-700"
          >
            {copied ? "Copied" : "Copy email"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
