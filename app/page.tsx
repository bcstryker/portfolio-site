import Image from "next/image";

import EmailActions from "@/components/EmailActions";
import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import {certifications, education, experiences, profile, projects, skills, teaching} from "@/content/profile";

type SectionIntroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

function SectionIntro({eyebrow, title, description}: SectionIntroProps) {
  return (
    <div className="space-y-3">
      {eyebrow ? <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">{eyebrow}</span> : null}
      <h2 className="heading">{title}</h2>
      {description ? <p className="subheading mt-0 text-gray-600">{description}</p> : null}
    </div>
  );
}

export default function Page() {
  return (
    <>
      <Header />
      <main className="container">
        <section id="home" className="section">
          <div className="grid items-start gap-10 md:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="mt-5 flex items-center gap-6">
                <div className="flex-shrink-0">
                  <Image
                    src="/hero-image.png"
                    alt="Brandon Stryker portrait"
                    width={176}
                    height={176}
                    priority
                    className="h-28 w-28 rounded-full border-2 border-brand bg-white object-cover shadow-lg md:h-32 md:w-32"
                  />
                </div>
                <div className="flex flex-col">
                  <h1 className="heading text-4xl md:text-5xl">{profile.name}</h1>
                  <span className="text-xs mt-2 ml-2 font-semibold uppercase tracking-[0.3em] text-brand">
                    {profile.role}
                  </span>
                </div>
              </div>
              <p className="mt-6 text-lg text-gray-600 md:text-xl">{profile.tagline}</p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-500">
                <span className="badge bg-blue-50 text-brand">Based in {profile.location}</span>
                {profile.availability ? <span className="badge">{profile.availability}</span> : null}
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#projects"
                  className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
                >
                  View work
                </a>
                <EmailActions
                  email={profile.email}
                  label="Start a project"
                  className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
                  helperPlacement="right"
                  helperOrientation="row"
                />
              </div>
            </div>
            <div className="card space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick facts</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Training Cisco teams, automating labor-intensive lab prep, and building software that stands up in
                  production.
                </p>
              </div>
              <ul className="space-y-4">
                {profile.highlights.map((item) => (
                  <li key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{item.value}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 p-4 text-sm text-gray-600">
                Ready to collaborate on automation tooling, instructor-led programs, or developer experience
                improvements.
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="About"
              title="Engineer and instructor focused on outcomes"
              description="I bridge hands-on Cisco instruction with full-stack product delivery so teams gain tools, mental models, and momentum."
            />
            <div className="prose max-w-none text-gray-700">
              <p>
                I thrive where software and networking intersect. My day-to-day spans building TypeScript and Python
                services, automating infrastructure, and leading Cisco certified courses that put programmability into
                practice.
              </p>
              <p>
                Whether I am architecting lab tooling for Skyline ATS or guiding DevNet professionals through complex
                APIs, I focus on clear systems, resilient automation, and human-centered instruction.
              </p>
            </div>
          </div>
        </section>

        <section id="experience" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="Experience"
              title="Leading automation and instruction initiatives"
              description="Selected roles that highlight how I blend software delivery with Cisco expertise."
            />
            <div className="space-y-6">
              {experiences.map((exp) => (
                <article key={`${exp.company}-${exp.role}`} className="card relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">{exp.role}</h3>
                    <span className="text-sm text-gray-500">{exp.period}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {exp.company} · {exp.location}
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-gray-600">
                    {exp.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-brand" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="skills" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="Capabilities"
              title="Skills that get projects shipped"
              description="A blend of engineering, network automation, and curriculum design experience."
            />
            <div className="grid gap-6 lg:grid-cols-2">
              {skills.map((group) => (
                <div key={group.name} className="card">
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <li key={item} className="badge">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="projects" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="Projects"
              title="Selected platforms, tooling, and curriculum"
              description="Representative work that showcases automation, analytics, and learner enablement."
            />
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard
                  key={project.title}
                  title={project.title}
                  description={project.description}
                  tech={project.tech}
                  outcome={project.outcome}
                  href={project.href}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="teaching" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="Instruction"
              title="Teaching that sticks"
              description="Courses and workshops designed to turn Cisco certifications into hands-on capability."
            />
            <div className="grid gap-6 lg:grid-cols-2">
              {teaching.map((item) => (
                <div key={item.name} className="card">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="credentials" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="Credentials"
              title="Certifications and continuing education"
              description="Recent badges from Cisco, Scrum.org, and AWS."
            />
            <div className="grid gap-6 lg:grid-cols-2">
              {certifications.map((cert) => (
                <div key={cert.name} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{cert.name}</h3>
                    <span className="text-xs font-semibold uppercase text-gray-400">{cert.issued}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Issued by {cert.issuer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="education" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="Education"
              title="Academic foundation"
              description="Formal study backed by continued Cisco instructor development."
            />
            <div className="grid gap-6">
              {education.map((item) => (
                <div key={item.school} className="card">
                  <h3 className="text-lg font-semibold text-gray-900">{item.school}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section border-t border-gray-200">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionIntro
              eyebrow="Contact"
              title="Let’s build the next thing"
              description="Drop a note to collaborate on network automation, developer tooling, or instructor-led training."
            />
            <div className="card space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-500">Email</p>
                <EmailActions
                  email={profile.email}
                  label={profile.email}
                  className="text-lg font-semibold text-brand hover:underline"
                  variant="link"
                  helperPlacement="right"
                  helperOrientation="row"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Connect</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-brand">
                  {profile.socials.map((item) => (
                    <a key={item.name} className="hover:underline" href={item.href} target="_blank" rel="noreferrer">
                      {item.name}
                    </a>
                  ))}
                </div>
              </div>
              <p className="muted">
                Prefer phone or enterprise onboarding? Reach out via email to coordinate the best channel.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-200 pb-16 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Brandon Stryker. All rights reserved.
        </footer>
      </main>
    </>
  );
}
