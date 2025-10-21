export const profile = {
  name: "Brandon Stryker",
  role: "Software Engineer & Cisco Instructor",
  tagline:
    "Full-stack engineer and Cisco Certified Systems Instructor helping teams automate infrastructure, ship production software, and master programmability.",
  location: "Newburgh, New York",
  availability: "",
  email: "bcstryker@gmail.com",
  socials: [
    {name: "LinkedIn", href: "https://www.linkedin.com/in/brandonstryker"},
    {name: "GitHub", href: "https://github.com/bcstryker"},
  ],
  highlights: [
    {
      label: "Current",
      value: "Developer & Cisco Instructor at Skyline ATS",
      description: "Building lab tooling, automation, and delivering DevNet, routing, and switching courses.",
    },
    {
      label: "Experience",
      value: "10+ years in software, automation, and instruction",
      description: "Full-stack web, infrastructure automation, curriculum development, and agile delivery.",
    },
    {
      label: "Focus",
      value: "TypeScript, Python, Cisco programmability",
      description: "Delivering production-ready apps, APIs, and training that stick.",
    },
  ],
};

export const experiences = [
  {
    company: "Skyline Advanced Technology Services",
    role: "Developer & Cisco Certified Systems Instructor",
    period: "2020 — Present",
    location: "Remote / Newburgh, NY",
    bullets: [
      "Deliver Cisco DevNet, routing, switching, and automation courses with hands-on labs tailored to client outcomes.",
      "Design and maintain internal React/Node tooling that provisions lab environments and tracks learner progress.",
      "Partner with Cisco SMEs to keep curriculum aligned with programmability releases and certification updates.",
    ],
  },
  {
    company: "Pickle Finance",
    role: "Full-Stack Engineer & Scrum Master",
    period: "2018 — 2020",
    location: "Remote",
    bullets: [
      "Shipped customer-facing web experiences with TypeScript, Next.js, and Node APIs focused on lending workflows.",
      "Facilitated agile rituals for a distributed team, driving predictable delivery and cross-functional visibility.",
      "Instrumented CI pipelines and release automation to shorten feedback loops and harden deployments.",
    ],
  },
  {
    company: "MinMax Data",
    role: "Software Engineer",
    period: "2016 — 2018",
    location: "New York, NY",
    bullets: [
      "Built ETL services and reporting dashboards that surfaced supply-chain analytics for enterprise customers.",
      "Created automated testing suites and monitoring to improve reliability across Python and Node services.",
      "Collaborated with data scientists to productionize models and expose them via RESTful APIs.",
    ],
  },
];

export const certifications = [
  {
    name: "Cisco Certified DevNet Professional (CCDevP)",
    issuer: "Cisco",
    issued: "2025",
  },
  {
    name: "Cisco Certified DevNet Specialist - DevOps (DEVOPS)",
    issuer: "Cisco",
    issued: "2025",
  },
  {
    name: "Cisco Certified DevNet Specialist - Core (DEVCOR)",
    issuer: "Cisco",
    issued: "2024",
  },
  {
    name: "Cisco Certified DevNet Associate (DEVASC)",
    issuer: "Cisco",
    issued: "2024",
  },
  {
    name: "Cisco Certified Network Administrator (CCNA)",
    issuer: "Cisco",
    issued: "2025",
  },
  {
    name: "Professional Scrum Master™ I (PSM I)",
    issuer: "Scrum.org",
    issued: "2021",
  },
  {
    name: "AWS Certified Solutions Architect – Associate",
    issuer: "Amazon Web Services",
    issued: "2017",
  },
];

export const skills = [
  {
    name: "Engineering",
    items: ["TypeScript", "Node.js", "React & Next.js", "Python", "REST & GraphQL", "CI/CD", "AWS"],
  },
  {
    name: "Networking & Automation",
    items: ["Cisco IOS & NX-OS", "DevNet APIs", "Meraki & Catalyst Automation", "Ansible", "NetDevOps tooling"],
  },
  {
    name: "Instruction & Leadership",
    items: ["Curriculum development", "Cisco course delivery", "Team mentorship", "Agile facilitation"],
  },
  {
    name: "Design & DX",
    items: ["Figma", "Component systems", "UX research", "Documentation"],
  },
];

type Project = {
  title: string;
  description: string;
  tech: string[];
  outcome: string;
  href?: string;
};

export const projects: Project[] = [
  {
    title: "Cisco Lab Automation Toolkit",
    description:
      "CLI and web tools that pre-stage Cisco lab environments, seed configs, and manage tear-down workflows used across training cohorts.",
    tech: ["TypeScript", "Node.js", "Cisco DevNet", "Ansible"],
    outcome: "Cut lab provisioning time from hours to minutes and reduced instructor setup issues.",
  },
  {
    title: "Learning Analytics Dashboard",
    description:
      "React dashboard that visualizes learner progress, lab completion, and quiz performance to inform follow-up coaching.",
    tech: ["React", "Next.js", "PostgreSQL", "Tailwind CSS"],
    outcome: "Enabled instructors to personalize feedback and lift completion rates across multi-week programs.",
  },
  {
    title: "Network Automation Workshop Series",
    description:
      "Immersive workshop curriculum blending Python scripting, Cisco APIs, and GitOps practices for network teams.",
    tech: ["Python", "Cisco APIs", "GitHub Actions", "Docker"],
    outcome: "Adopted by enterprise clients to jumpstart DevNet practices with repeatable lab guides.",
  },
  {
    title: "Financial Services Onboarding Portal",
    description:
      "Responsive onboarding flow for Pickle Finance that coordinates identity verification, compliance, and loan origination tasks.",
    tech: ["TypeScript", "Next.js", "GraphQL", "Storybook"],
    outcome: "Improved application completion rates and reduced manual reconciliation for operations.",
  },
];

export const education = [
  {
    school: "B.S., Psychology — Baruch College",
    detail: "Focused on cognition and learning science; insights that shape instructional design.",
  },
  {
    school: "M.S., Software Engineering — West Virginia University",
    detail: "William M. Statler College of Engineering & Mineral Resources",
  },
];

export const teaching = [
  {
    name: "Cisco DevNet Associate & Professional",
    description: "Program design, lab development, and delivery focused on real-world programmability scenarios.",
  },
  {
    name: "Routing & Switching Bootcamps",
    description: "Instructor-led courses emphasizing practical configuration, troubleshooting, and mental models.",
  },
  {
    name: "Network Automation with Python",
    description: "Workshop series guiding network engineers through scripting, APIs, and infrastructure as code.",
  },
];
