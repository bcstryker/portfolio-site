
type Props = {
  title: string;
  description: string;
  tech?: string[];
  outcome?: string;
  href?: string;
};

export default function ProjectCard({ title, description, tech = [], outcome, href }: Props) {
  return (
    <article className="card flex h-full flex-col">
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
      </div>
      {tech.length > 0 && (
        <div className="mt-4 flex flex-wrap">
          {tech.map(item => (
            <span key={item} className="badge">
              {item}
            </span>
          ))}
        </div>
      )}
      {outcome && <p className="mt-4 text-sm text-gray-500">{outcome}</p>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center text-sm font-medium text-brand hover:underline"
        >
          View project
        </a>
      )}
    </article>
  );
}
