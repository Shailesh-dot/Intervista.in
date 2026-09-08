export default function TargetUsersSection() {
  const users = [
    "Technology Companies",
    "HR Teams",
    "Universities",
    "Skill Platforms",
    "Training Organizations",
  ];

  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6 text-center">
        <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] uppercase text-brand-dark/60 bg-brand-dark/5 rounded-full">
          Who it's for
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-brand-dark mb-12 tracking-tight">
          Who Can Use This Platform
        </h2>
        
        <div className="flex flex-wrap justify-center gap-4">
          {users.map((u, i) => (
            <div 
              key={i} 
              className="px-8 py-4 bg-brand-light border border-brand-dark/5 rounded-2xl text-lg font-bold text-brand-dark hover:bg-brand-secondary hover:scale-105 transition-all duration-300 cursor-default"
            >
              {u}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}