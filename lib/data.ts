import type { SkillCategory, Experience, Education, Project } from '@/types/portfolio';

export const Bio = {
  name: "Nathan",
  roles: [
    "Full-Stack Software Engineer",
    "Product Engineer",
    "Startup Focused",
    "Web3 Believer",
    "Automation Enthusiast",
  ],
  github: "https://github.com/naethun",
  resume:
    "https://drive.google.com/file/d/1ptcUhHXjPFcjKnvj1B39xJHiOIzAEUag/view?usp=drive_link",
  linkedin: "https://www.linkedin.com/in/naethun/",
};

export const experiences: Experience[] = [
  {
    id: 0,
    img: "https://media.licdn.com/dms/image/v2/D4E0BAQGpif9l90Gmww/company-logo_100_100/B4EZcfGRU8HsAU-/0/1748573427276/energex_ai_logo?e=1766016000&v=beta&t=aT8qXXaa58KA4-5ypp-o2OWUG6gzzhvkz46IZKwlcrc",
    role: "Software Engineer",
    company: "EnergeX AI",
    date: "Sept 2025 - Present",
    desc: `EnergeX AI is an AI-driven CRM platform that automates outbound sales calls & real-time analytics for high-volume teams.

    - Architected & shipped a multi-campaign calling system, enabling concurrent campaign execution with isolated queue runners, safe concurrency controls, & automated pause/resume logic based on real-time agent availability. Increased effective call throughput by 2-3x without additional infrastructure.

    - Engineered an O(1) advanced filtering & bulk-operation engine for call analytics, implementing indexed, type-safe dynamic filters & campaign-level aggregation views. Reducing analyst workflow friction by ~99% & enabling instant segmentation across hundreds of thous&s of calls.

    - Built full-stack CRUD APIs & a dynamic call analysis pipeline, integrating OpenAI to parse transcripts into structured analysis fields via webhooks. Cutting manual review time by over 50% while improving consistency of call outcome classification.

    - Led a comprehensive full-stack UI redesign across 60+ production files, extracting reusable React design primitives (tables, stat cards, page shells) & introducing a unified animation system. Modernizing the dashboard UX & significantly improving usability for high-volume call center workflows.
    `,
    skills: [
      "Node.js",
      "PostgreSQL",
      "Docker",
      "Git",
      "OpenAI",
      "Next.js",
    ],
  },
  {
    id: 1,
    img: "https://media.licdn.com/dms/image/v2/D560BAQGI0qD01ndvwQ/company-logo_200_200/B56ZnpbPqYKIAI-/0/1760557858762/daedastream_logo?e=1766016000&v=beta&t=M1J97L1SXQpuhlGJfALIhfueIaW9roT6JgkIAcX6idU",
    role: "Software Engineer",
    company: "Daedastream",
    date: "June 2025 - Present (Contracted)",
    desc: `Daedastream is a software agency that automates processes for clients, provides full-stack development, & AI-driven operations.
  
    - Contributed to a multi-agent orchestration framework using tmux + Redis Streams, enabling dynamic spawning, coordination, & messaging between frontend, backend, & DevOps agents.
  
    - Engineered console-capture automation using Playwright + NDJSON streaming to classify browser errors in real time & route them into the Redis-tmux loop for automated debugging workflows.
  
    - Developed custom automation solutions for multiple clients, improving their analytics pipelines, system reliability, & operational efficiency through tailored data-processing & monitoring tools.
  
    - Designed modular service components & internal APIs to support scalable automation, easier agent lifecycle management, & extensible event-driven architecture.
  
    - Enhanced developer tooling by integrating test harnesses, logging utilities, & environment setups that accelerated iteration velocity across the engineering team.
    `,
    skills: [
      "Python",
      "Redis",
      "Tmux",
      "Playwright",
      "Git",
    ],
  },  
  {
    id: 2,
    img: "https://media.licdn.com/dms/image/v2/D4E0BAQFFnQDKU-9RVw/company-logo_100_100/B4EZarxyFiHoAU-/0/1746638677031/familia_io_logo?e=1766016000&v=beta&t=4aPxxBtVloGdJ920LN1XnLlJHkEBvyWWg-pYVjA2Zjo",
    role: "Software Engineer",
    company: "Familia",
    date: "May 2025 - Oct 2025",
    desc: `Familia is a start-up focused on mental wellness, building an app that enables users to meditate together.

    - Designed & implemented a tiered, matching algorithm that combines dynamic user preferences with manual partner selection. Significantly improving accuracy & personalization in user-to-user pairing for 150+ active users.

    - Developed a real-time chat & internal notification system with WebSockets, boosting user retention.

    - Architected, deployed, & maintained a scalable PostgreSQL database with fully normalized schema design, advanced index optimization, & detailed technical documentation. Supported high-volume concurrent users & long-term maintainability.

    - Led end-to-end full-stack development of both web & mobile platforms (Next.js & React Native). Driving feature development, UI/UX consistency, & backend integration within an Agile workflow. Enabling a rapid iteration with scalable feature rollout.
    `,
    skills: [
      "Node.js",
      "AWS",
      "React Native",
      "PostgreSQL",
      "Railway",
      "Git",
      "Figma",
    ],
  },
  {
    id: 3,
    img: "https://img1.wsimg.com/isteam/ip/7230bf8c-78a3-4764-bbc6-b984344c2a04/Viet_Voices_Logo_Phrase.png/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:400,cg:true",
    role: "Data Analyst",
    company: "Viet Voices",
    date: "Jan 2024 - Jul 2025",
    desc: `A non-profit organization that focuses on representing marginalized Vietnamese & other AAPI communities within San Diego.

        - Developed a predictive machine learning model using logistic regression (scikit-learn) to classify voters based on their likelihood of consistent turnout. The model incorporated demographic, geographic, & behavioral features sourced from multiple datasets. Achieving measurable improvements in prediction accuracy over baseline heuristics.

        - Built a scalable Python data pipeline for historical election analysis. Utilizing P&as & NumPy to ingest, clean, & transform voter turnout data from seven election cycles. The pipeline supported real-time querying & streamlined exploratory data analysis for civic trend detection.

        - Quantified civic engagement patterns using conditional probability analysis & tier-based classification.

        - Redesigned & prototyped the organization's web interface in Figma, focusing on accessibility, information hierarchy, & interactive data visualizations. Then deployed frontend enhancements.

        - Selected to represent the team in Sacramento for a 3-day field research initiative. Conducted in-person analysis of the Political Data Intelligence (PDI) voter file system, extracting high-impact features for use in the model & campaign planning.
        `,

    skills: [
      "Machine Learning",
      "Python",
      "P&as",
      "NumPy",
      "Matplotlib",
      "Seaborn",
      "Plotly",
      "SciPy",
      "Scikit-learn",
    ],
  },
  {
    id: 4,
    img: "https://yt3.googleusercontent.com/ytc/AIdro_nqJRBE-PvehwgWqiwAhPzjuDAi6kca33Z5mvp4UADlcyI=s900-c-k-c0x00ffffff-no-rj",
    role: "Lead Coding Instructor",
    company: "Code Ninjas",
    date: "Dec 2022 - Sept 2025",
    desc: `A place for students from ages 7-14 to learn basic Computer Science concepts & fundementals of software development.

      - Lead instructor, h&ling the management of our daily team & optimizing operations for our location.

      - Developed programs with Node JS & Python which automates certain tasks for our center director. A few programs I have made were, tracking quarterly attendance which resulted in a 20% increase in efficiency compared to manual methods, & a email filter which parsed through a list of over 1000 emails & got rid of duplicates & customers who don't want to be apart of the email list anymore.

      - Delegated tasks & managed other instructors to ensure each student is being educated efficiently & effectively.`,
    skills: [
      "JavaScript",
      "NodeJS",
      "C#",
      "Python",
    ],
  },
  {
    id: 5,
    img: "https://pbs.twimg.com/profile_images/1549089349119139843/AuqvKpSs_400x400.png",
    role: "Software Developer",
    company: "LightningATC",
    date: "May 2022 - Jun 2023",
    desc: `A software that focuses on automating checkout proccesses for sneaker resellers to maximize profits.

        - Developed a high-performance Chrome extension optimized for low-latency data relaying & scalable concurrent user management, supporting a large active user base.

        - Reverse-engineered private stock API endpoints on Supreme, architecting a real-time monitoring system capable of h&ling thous&s of concurrent WebSocket connections with sub-20ms latency.

        - Engineered automated checkout modules for Footlocker PH & ASOS using advanced DOM manipulation, regex-based scraping, client-side monitoring, & dynamic payment orchestration.
      `,
    skills: [
      "Reverse Engineering",
      "Node.js",
      "DOM Manipulation",
      "Regex",
      "Client-side Monitoring",
      "Chrome Extension",
    ],
  },
];

export const education: Education[] = [
  {
    id: 0,
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:&9GcQQLZWQOYPjTdus9VobVJyBjjPdyc0tOGwOpA&s",
    school: "Southwestern Community College",
    date: "Aug 2022 - May 2025",
    grade: "3.6",
    desc: "Relevant coursework: Data Structures & Algorithms, Computer Organization & Architecture, Discrete Structures, Linear Algebra, Calculus 1 & 2, Physics (Mechanics & Electromagnetism), Statistics",
    degree: "Associate Degree for Transfer, Computer Science",
  },
  {
    id: 1,
    img: "https://i.pinimg.com/originals/fd/fd/bb/fdfdbb35dc080581686e32a94d67c7ad.jpg",
    school: "University of California, San Diego",
    date: "Sept 2025 - June 2027",
    grade: "3.6",
    desc: `Scholarships: NSF EMPOWERs Engineering, Chancellor's Associates Scholarship`,
    degree: "Bachelor's of Science, Cognitive Science Spec. Machine Learning & Neural Computation",
  },
];

export const projects: Project[] = [
  {
    id: 9,
    title: "Redacted CLI",
    date: "July 2022 - Jan 2023",
    description:
      `A software that automated tasks for our users on Discord & across the NFT space. I focused on the backend modules, specifically the NFT ones. We built a community of 2,600+ members throughout the whole process.

      Some features that we had:
      MagicEden NFT Sniper, user set a price for a specific NFT, we h&led searching the backend for it, & proccessed the transaction on the blockchain it as soon as it finds the matching parameters.
      Multi-Threaded C&yMachine NFT Minter, user set a NFT mint they wanted, we processed the transaction within a second as soon as it went live.`,
    image:
      "https://i.postimg.cc/nhCVVKbQ/Screenshot-2024-08-07-at-5-32-07-PM.png",
    tags: [
      "JavaScript",
      "TypeScript",
      "Node Js",
      "SOL & ETH Blockchain",
      "Rest API's",
    ],
    category: "CLI Software",
    github: "https://github.com/naethun/RedactedCLI",
  },
  {
    id: 1,
    title: "Telios AIO",
    date: "Dec 2022 - April 2023",
    description:
      `Full-stack development by me & my colleague. I focused on the backend. The purpose of this chrome extension was to help their users checkout a desired product in order to make a profit. By the use of automation, requests, & web scraping— this chrome extension was able to do what a human could do within in seconds.

      During the peak of it's era, it was highly functional & successful.

      Currently, I am not sure what modules work but I'm sure the shopify autofill may not be depreciated.`,
    image:
      "https://i.postimg.cc/9FPPH35P/t1.png",
    tags: ["Google Chrome Extension", "JavaScript", "HTML", "CSS", "jQuery"],
    category: "Chrome Extension",
    github: "https://github.com/naethun/Telios-AIO/",
  }
];
