"use client";

import Link from "next/link";
import {useEffect, useState} from "react";

import {profile} from "@/content/profile";

const links = [
  {href: "#home", label: "Home"},
  {href: "#about", label: "About"},
  {href: "#experience", label: "Experience"},
  {href: "#skills", label: "Skills"},
  {href: "#projects", label: "Projects"},
  {href: "#teaching", label: "Teaching"},
  {href: "#contact", label: "Contact"},
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-transparent transition-all ${
        scrolled ? "border-gray-200 bg-white/80 backdrop-blur" : "bg-white"
      }`}
    >
      <nav className="container flex items-center justify-end py-4">
        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-gray-700 transition hover:text-gray-900">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={profile.socials[0]?.href ?? "#contact"}
            className="hidden items-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand hover:text-brand md:inline-flex"
            target="_blank"
            rel="noreferrer"
          >
            Connect
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 p-2 text-sm text-gray-700 transition hover:border-brand hover:text-brand md:hidden"
            aria-label="Toggle navigation"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="sr-only">Toggle menu</span>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {open ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="container py-4">
            <ul className="flex flex-col gap-3">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={profile.socials[0]?.href ?? "#contact"}
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-brand transition hover:bg-blue-50"
                  target="_blank"
                  rel="noreferrer"
                >
                  Connect on LinkedIn
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
