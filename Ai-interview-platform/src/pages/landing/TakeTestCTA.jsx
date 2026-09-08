import { Link } from "react-router-dom";

export default function TakeTestCTA() {
  return (
    <section id="test" className="py-32 bg-brand-light">
      <div className="container mx-auto px-6">
        <div className="relative overflow-hidden bg-brand-dark rounded-[2rem] p-12 md:p-24 text-center">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
              Ready to Experience <br />AI Interviews?
            </h2>
            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
              Join hundreds of companies that have already transformed their 
              hiring process with KnitNet.
            </p>
            <Link to="/login" className="px-10 py-5 bg-brand-secondary text-brand-dark text-lg font-black rounded-full hover:scale-105 hover:shadow-2xl hover:shadow-brand-secondary/20 transition-all duration-300">
              Take the Test Now
            </Link>
          </div>
          
          {/* Decorative blurs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/20 blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-secondary/10 blur-[100px]"></div>
        </div>
      </div>
    </section>
  );
}