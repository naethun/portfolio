import type { Experience, Project } from "@/types/portfolio";

export const Bio = {
  name: "Nathan",
  github: "https://github.com/naethun",
  resume:
    "https://drive.google.com/file/d/1N3kuuJif2t6-Ne9_n8QFMu-uywxGdaNn/view?usp=sharing",
  linkedin: "https://www.linkedin.com/in/naethun/",
};

export const experiences: Experience[] = [
  {
    id: 0,
    img: "/aedemo1.gif",
    role: "Founding Software Engineer",
    company: "Aesthetic",
    date: "December 2025 - Present",
    desc: `Aesthetic is a all-in-one shopping platform that allows users to buy products through our fully autounomus shopping assistant. 100k+ users, 250k+ GMV, 160k+ on Instagram

    - Users can upload a image, send social media links of posts, and our app finds all similar products on the web that is inside of the image or posts. Users can then buy the products directly from the app, never having to leave the app.

    - We are mapping human taste by analyzing user's internet activity into vectorized identity models. Scraping user's Instagram, Pinterest, and Gmail data to recommend products to users based on their taste profiles.

    - Built the core visual search experience across web and mobile — interactive gesture-driven bounding box selection (60fps via Reanimated shared values), coordinate system transformation between platforms, race condition elimination via AbortController lifecycle management, and a product condition classifier with 40+ domain priors — plus an app-wide offline resilience layer with graceful degradation

    - Architected a full-stack AI product intelligence pipeline across 3 codebases — Firecrawl web scraping → LLM-powered structured extraction (Schematron 8B) → two-tier async caching (sync top-5 + backgroundLambda for 6-15) → mobile delivery with graceful fallback, reducing product detail load times from seconds toinstant for returning users

    - Led zero-downtime migration from DynamoDB to PostgreSQL for the entire backend, built migration that processed 4.6M + records, feature flags for safe rollout, & comprehensive tests.
    `,
    skills: ["Node.js", "Expo", "Next.js", "AWS", "PostgreSQL", "DynamoDB"],
  },
  {
    id: 1,
    img: "/energex.gif",
    role: "Software Engineer - 6-figure ARR",
    company: "EnergeX AI",
    date: "September 2025 - April 2026",
    desc: `EnergeX AI is an AI-driven CRM platform that automates outbound sales calls & real-time analytics for high-volume teams.

    - Architected & shipped a multi-campaign calling system, enabling concurrent campaign execution with isolated queue runners, safe concurrency controls, & automated pause/resume logic based on real-time agent availability. Increased effective call throughput by 2-3x without additional infrastructure.

    - Engineered an O(1) advanced filtering & bulk-operation engine for call analytics, implementing indexed, type-safe dynamic filters & campaign-level aggregation views. Reducing analyst workflow friction by ~99% & enabling instant segmentation across hundreds of thous&s of calls.

    - Built full-stack CRUD APIs & a dynamic call analysis pipeline, integrating OpenAI to parse transcripts into structured analysis fields via webhooks. Cutting manual review time by over 50% while improving consistency of call outcome classification.

    - Led a comprehensive full-stack UI redesign across 60+ production files, extracting reusable React design primitives (tables, stat cards, page shells) & introducing a unified animation system. Modernizing the dashboard UX & significantly improving usability for high-volume call center workflows.
    `,
    skills: ["Node.js", "PostgreSQL", "Docker", "Git", "OpenAI", "Next.js"],
  },
  {
    id: 2,
    img: "https://media.licdn.com/dms/image/v2/D560BAQGI0qD01ndvwQ/company-logo_200_200/B56ZnpbPqYKIAI-/0/1760557858762/daedastream_logo?e=1773273600&v=beta&t=RkttNoFWeGXza1YmSHmBrx9wzD47T2O21KE7E5HInfg",
    role: "Software Engineer",
    company: "Daedastream",
    date: "June 2025 - December 2025",
    desc: `Daedastream is a software agency that automates processes for clients, provides full-stack development, & AI-driven operations.

    - Contributed to a multi-agent orchestration framework using tmux + Redis Streams, enabling dynamic spawning, coordination, & messaging between frontend, backend, & DevOps agents.

    - Engineered console-capture automation using Playwright + NDJSON streaming to classify browser errors in real time & route them into the Redis-tmux loop for automated debugging workflows.

    - Developed custom automation solutions for multiple clients, improving their analytics pipelines, system reliability, & operational efficiency through tailored data-processing & monitoring tools.

    - Designed modular service components & internal APIs to support scalable automation, easier agent lifecycle management, & extensible event-driven architecture.

    - Enhanced developer tooling by integrating test harnesses, logging utilities, & environment setups that accelerated iteration velocity across the engineering team.
    `,
    skills: ["Python", "Redis", "Tmux", "Playwright", "Git"],
  },
  {
    id: 4,
    img: "https://img1.wsimg.com/isteam/ip/7230bf8c-78a3-4764-bbc6-b984344c2a04/Viet_Voices_Logo_Phrase.png/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:400,cg:true",
    role: "Data Engineer",
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
    id: 5,
    img: "https://yt3.googleusercontent.com/ytc/AIdro_nqJRBE-PvehwgWqiwAhPzjuDAi6kca33Z5mvp4UADlcyI=s900-c-k-c0x00ffffff-no-rj",
    role: "Lead Developer & Instructor",
    company: "Code Ninjas",
    date: "Dec 2022 - Sept 2025",
    desc: `A place for students from ages 7-14 to learn basic Computer Science concepts & fundementals of software development.

      - Lead instructor, h&ling the management of our daily team & optimizing operations for our location.

      - Developed programs with Node JS & Python which automates certain tasks for our center director. A few programs I have made were, tracking quarterly attendance which resulted in a 20% increase in efficiency compared to manual methods, & a email filter which parsed through a list of over 1000 emails & got rid of duplicates & customers who don't want to be apart of the email list anymore.

      - Delegated tasks & managed other instructors to ensure each student is being educated efficiently & effectively.`,
    skills: ["JavaScript", "NodeJS", "C#", "Python"],
  },
  {
    id: 6,
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

export const projects: Project[] = [
  {
    id: 3,
    title: "Helping Anxious Beginners Learn Before They Invest",
    date: "COGS 127 · Spring 2026",
    description: `A live case study from UCSD's COGS 127 (Data-Driven UX/Product Design). My team studied how young, first-time investors with mental health conditions actually behave inside Robinhood, then designed a practice-first learning layer that lets them build confidence before risking real money.`,
    image: "/portfolio/cogs127/cover.svg",
    tags: [
      "UX Research",
      "Interaction Design",
      "Figma",
      "Usability Testing",
      "Fintech",
      "Accessibility",
    ],
    category: "UX Research & Design — COGS 127",
    github: "https://www.figma.com/design/Mr9830xmwwIq5Q7SmdtJIw/COGS-127---Robinhood-Extension-Hi-Fi-Prototype",
    caseStudy: {
      hero: "/portfolio/cogs127/cover.svg",
      subtitle:
        "A practice-first learning layer that helps overwhelmed first-time investors build confidence before risking real money.",
      sections: [
        { type: "heading", content: "Overview" },
        {
          type: "text",
          content: `Robinhood made investing feel as easy as tapping a button — but for millions of young, first-time investors, "easy to access" never meant "easy to understand." Over a quarter, my team studied people who genuinely wanted to invest responsibly yet felt overwhelmed, anxious, or unsure the moment they opened the app, then defaulted to guessing. Our answer is a practice-first learning layer built into Robinhood: a zero-risk sandbox and bite-sized, plain-language lessons that let beginners build real confidence before a single dollar is on the line.`,
        },
        {
          type: "image",
          content: "/portfolio/cogs127/sandbox.png",
          alt: "Zero-risk Practice Sandbox with mock funds",
        },
        { type: "heading", content: "The problem" },
        {
          type: "text",
          content: `Young, first-time investors who also live with mental health conditions — anxiety, depression, BPD — want to grow their money, but mobile trading apps amplify impulsive, emotionally-reactive decisions and offer no real path to understanding. Left without guidance, they fall back on surface cues like trending lists, green percentages, and whatever sits at the top of the screen, rather than informed reasoning. The need isn't a flashier app; it's a way to feel safe enough to learn before money is on the line.`,
        },
        { type: "heading", content: "Why it matters" },
        {
          type: "text",
          content: `Robinhood sits at the intersection of two trends in our generation. It reports 26.5M funded accounts — roughly 75% under 43 and nearly half first-time investors (Fortune, 2026) — and that same group is the most psychologically vulnerable: 46% of Gen Z hold a formal mental health diagnosis (Harmony Healthcare IT, 2025). Participation is climbing while comprehension lags: Gen Z has the lowest financial literacy of any generation at ~38% (2025 TIAA Institute-GFLEC Index), yet 56% of 18–25-year-olds already invest.

In January 2024, Robinhood was charged with trivializing investing and nudging inexperienced users toward riskier, more frequent trades through confetti, streaks, and frictionless purchasing — design patterns that map directly onto the negative urgency seen in conditions like BPD. With an estimated $80T in wealth transferring to younger generations in the coming decades, designing for understanding rather than impulse isn't just ethical; it's how a platform earns long-term trust.`,
        },
        { type: "heading", content: "My role" },
        {
          type: "text",
          content: `A four-person team project (James, Alex, Natalin, and me) spanning a full quarter. I contributed across the full process rather than owning a single lane:

- User research & interviews: helped design the interview protocol and the live "$300 to invest" task, then ran moderated, think-aloud sessions with participants and captured their behavior, hesitations, and quotes.

- Synthesis & findings: turned raw interview notes into per-participant findings and the cross-participant insights that exposed the real pattern — confidence without comprehension, and safety mattering more than lesson depth.

- Problem framing & thesis: helped sharpen the problem statement to focus on people rather than the app, and drove the point-of-view that reframed the project from "add more education" to "give beginners a zero-risk place to learn by doing."

- Design & prototyping: contributed to the high-fidelity design directions and iterations in Figma (the sandbox, lesson flows, and landing-page concepts), and to the design edits made in response to user-testing feedback.

- Closing the loop with users: brought the designs back to people from our original interview group, walked them through the prototype, and captured what resonated and what fell flat — feeding their reactions directly into the next round of design decisions.`,
        },
        { type: "heading", content: "Research: how do beginners actually behave?" },
        {
          type: "text",
          content: `We ran moderated, think-aloud interviews with four participants spanning low to intermediate financial literacy — Isabella (19), Clara (20), Dylan (19), and Aaron (17). Each started with background questions, told a real "last time you had extra money" story, then attempted a live task: "You just got paid and have $300 left after expenses. Using the Robinhood app, walk me through what you'd do." We watched where attention went, where people hesitated, and where confidence and understanding came apart.`,
        },
        { type: "heading", content: "What we saw" },
        {
          type: "text",
          content: `Confidence rarely meant understanding. Isabella chose a stock simply because it was "at the top" of the app, feeling sure despite having done no research. Beginners leaned on visual hierarchy — trending lists, big percentages, familiar brand names — to stand in for reasoning the app never taught.

Risk and uncertainty were a universal barrier. Aaron, the least experienced, said the app "didn't feel welcoming to someone who's new to this" and wanted to call his parents before doing anything. Even Dylan, the most confident, held back because he couldn't see projected outcomes before committing. Clara showed that access to financial tools doesn't equal literacy — she used banking apps daily but still felt lost on investing, taxes, and retirement.

Across everyone, jargon and on-screen overload were the friction points: moving numbers with no meaning, "top movers" that were moving down, and dense help text that explained nothing.`,
        },
        { type: "heading", content: "The insight" },
        {
          type: "text",
          content: `The real barrier wasn't a lack of information — it was a lack of permission to explore without consequences. When we looked at where engagement actually clustered, it was around the feeling of safety, not the depth of any lesson. One participant wanted a parent present before touching anything; another specifically gravitated to "practice mode"; a third responded more to reduced visual overwhelm than to anything we taught. That reframed the project: don't add more content — give people a zero-risk place to learn by doing.`,
        },
        { type: "heading", content: "Designing the solution" },
        {
          type: "text",
          content: `We explored two entry points: a dedicated, self-paced Tutorials tab that never disrupts the existing UI, and a re-accessible onboarding tutorial that can be reopened anytime from settings. Early sketches drew on Duolingo-style modular lessons — small, ordered, progress-saving — and taught us that button placement and visual hierarchy are far from obvious and worth iterating on directly.

From there we built high-fidelity directions: a simplified portfolio hub that collapses the firehose of charts and numbers into a few expandable cards; a Standard / Focus View toggle that lets users dial down intensity depending on how they feel; and a Practice Sandbox using clearly-labeled mock funds. On the lesson side we prototyped a personalized learning-style setup feeding a short, one-concept-at-a-time flow (e.g. P/E ratio) with mock-money practice and hold-to-confirm friction, plus an annotated version layered over a realistic Robinhood screen.`,
        },
        {
          type: "image",
          content: "/portfolio/cogs127/lesson.png",
          alt: "Lesson flow — one concept at a time with mock-money practice",
        },
        {
          type: "image",
          content: "/portfolio/cogs127/concepts.png",
          alt: "Standard and Focus View concept for reducing visual intensity",
        },
        {
          type: "embed",
          content:
            "https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Fdesign%2FMr9830xmwwIq5Q7SmdtJIw%2FCOGS-127---Robinhood-Extension-Hi-Fi-Prototype%3Fnode-id%3D0-1",
          title: "Interactive Figma prototype — Robinhood learning layer",
          ratio: "16 / 10",
        },
        { type: "heading", content: "Testing two directions" },
        {
          type: "text",
          content: `We compared two prototypes in a within-subjects A/B study, counterbalancing order to reduce bias, with sessions framed as a test of the design — never of the participant. Two takeaways were consistent: Prototype A's linear navigation and a clear "next" gave low-confidence users the structure they needed, while Prototype B's cleaner visual hierarchy and color lowered the barrier to engage at all. Both participants gravitated to the practice section precisely because no real money was involved. Testing also surfaced concrete fixes: font sizes were too small, and an all-green interface made it ambiguous which elements were actually interactive.`,
        },
        { type: "heading", content: "Where it landed" },
        {
          type: "text",
          content: `The final direction makes the zero-risk sandbox the default entry point — keeping A's step-by-step navigation as the backbone while adopting B's visual language. Two changes mattered most. First, we replaced the real, volatile stock shown in an alarming red chart (which unsettled testers even with a "this is practice" banner) with a fictional stock on a gentle upward curve, removing real-market anxiety entirely. Second, instead of dropping users into an undifferentiated list, the learning tab now opens to pre-selected beginner lessons with time estimates and difficulty tags, tracked progress, and a clear "continue" — so users always know where to start, with plain-language definitions surfacing for any jargon they hit.`,
        },
        {
          type: "image",
          content: "/portfolio/cogs127/before-after.png",
          alt: "Before and after — volatile real stock replaced with a calm fictional one, plus guided lessons",
        },
        { type: "heading", content: "What I'd do next" },
        {
          type: "text",
          content: `Push the lessons fully inside the sandbox so users learn by doing rather than reading; validate specifically with the target population managing anxiety and BPD rather than general beginners; and run a dedicated accessibility pass on the font-size and button-affordance issues testing exposed. The throughline: the most ethical version of this product is also the most retentive one — trust and understanding become the reason people stay.`,
        },
      ],
    },
  },
  {
    id: 9,
    title: "Redacted CLI",
    date: "July 2022 - Jan 2023",
    description: `A software that automated tasks for our users on Discord & across the NFT space. I focused on the backend modules, specifically the NFT ones. We built a community of 2,600+ members throughout the whole process.

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
    description: `Full-stack development by me & my colleague. I focused on the backend. The purpose of this chrome extension was to help their users checkout a desired product in order to make a profit. By the use of automation, requests, & web scraping— this chrome extension was able to do what a human could do within in seconds.

      During the peak of it's era, it was highly functional & successful.

      Currently, I am not sure what modules work but I'm sure the shopify autofill may not be depreciated.`,
    image: "https://i.postimg.cc/9FPPH35P/t1.png",
    tags: ["Google Chrome Extension", "JavaScript", "HTML", "CSS", "jQuery"],
    category: "Chrome Extension",
    github: "https://github.com/naethun/Telios-AIO/",
  },
  {
    id: 2,
    title: "CareFi (LIVE AI BEST COAST 2025 HACKATHON WINNER)",
    date: "3 day hackathon",
    description: `We were inspired by a friend’s dermatology club that asked us to create a website for skincare analysis. This sparked our idea to build an AI-powered platform that makes personalized skincare accessible and affordable for everyone.

      CareFi uses advanced AI to analyze a user’s skin from photos and detect common conditions such as acne, dryness, oiliness, and sensitivity. It then recommends a customized skincare routine tailored to each user’s unique needs and budget, providing insights often associated with dermatologist-quality results.

      Frontend/Backend: Next.js for high performance, API and App routing, SSR, and TypeScript + TailwindCSS

      Database: PostgreSQL for highly consistent & horizontal data storage, user authentication, RLS policies for security, and real-time subscriptions / webhooks

      AI + Analysis: We used OpenAI Vision (specifically gpt-4o-mini) to analyzing uploaded images. We have another agent for also the recommendation process too. Out of a list of 100 products, we send the agent 40 unique & well matched products (tier-based classification based on ingredients list) to the agent and have it write the list of recommended products and measure through a confidence scale.

      Architecture: RESTful API routes in /app/api/ Endpoints include:
      /api/signup - User registration
      /api/signin - User authentication
      /api/analysis/start - Start face analysis
      /api/analysis/latest - Get latest analysis results
      /api/recommendations - Get personalized recommendations
      /api/uploadImage - Upload face images
      /api/settings/* - User settings management

      Key Features Built with This Stack:
      Product Image Analysis - Upload photos → AI extracts ingredients
      Personalized Dashboard - View analysis, recommendations, KPIs
      Budget Optimizer - Track spending on skincare products
      Routine Planner - Morning/evening skincare routines
      Onboarding Flow - Collect user skin profile (type, concerns, allergies
      `,
    image:
      "https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/966/990/datas/original.png",
    tags: ["Next.js", "Node.js", "PostgreSQL", "OpenAI", "Docker", "Git"],
    category: "Web Application",
    github: "https://devpost.com/software/carefi",
  },
];
