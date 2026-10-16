'use client';

const roles = [
  'Software Engineer',
  'Product Engineer',
  'Digital & Web Design',
  'Technologist + Creative',
];

function RoleMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M20 8C25-4 30 0 28 12C40 5 44 13 32 19C45 23 40 31 29 27C34 40 25 44 21 31C15 45 8 40 12 28C-1 35-5 26 8 21C-5 16 0 8 12 12C7-1 16-5 20 8Z"
        transform="translate(3 3) scale(.85)"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function IdentityHeader({ onHome }: { onHome: () => void }) {
  return (
    <div className="identity-header">
      <div className="identity-mark" aria-hidden="true">
        <svg viewBox="0 0 310 320" fill="currentColor">
          <path d="M176 0 184 99 270 52 212 136 310 160 212 184 270 267 184 220 176 320 141 228 75 303 102 205 0 218 84 160 0 102 102 115 75 17 141 92Z" />
        </svg>
        <span /><span /><span /><span />
      </div>
      <div className="identity-copy">
        <h1>
          <button type="button" onClick={onHome} aria-label="Nathan — go to work">
            <span>Hello,</span>
            <span>I’m Nathan</span>
          </button>
        </h1>
        <p className="identity-location">Based in San Diego &amp; Los Angeles</p>
        <ul className="identity-roles">
          {roles.map((role) => (
            <li key={role}><RoleMark /><span>{role}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
