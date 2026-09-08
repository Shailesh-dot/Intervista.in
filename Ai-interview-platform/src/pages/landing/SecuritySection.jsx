export default function SecuritySection() {
  return (
    <section id="security" className="py-32 bg-brand-light">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12 p-12 bg-white border border-brand-dark/5 rounded-[3rem] shadow-2xl shadow-brand-dark/5">
          <div className="md:w-1/3 flex justify-center">
            <div className="w-24 h-24 bg-brand-secondary rounded-[2rem] flex items-center justify-center">
              <span className="text-4xl text-brand-dark">🔒</span>
            </div>
          </div>
          <div className="md:w-2/3 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-brand-dark mb-4 tracking-tight">
              Enterprise-Grade Security
            </h2>
            <p className="text-lg text-brand-gray leading-relaxed">
              Secure cloud infrastructure, encrypted communication,
              and role-based access control protect candidate data. Your trust is our priority.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}