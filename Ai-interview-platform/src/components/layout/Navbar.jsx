import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const NavLink = ({ href, children, isDarkText }) => (
  <a
    href={href}
    className={`relative group text-sm font-bold ${isDarkText ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/90 hover:text-white"} transition-colors py-1`}
  >
    {children}
    <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] ${isDarkText ? "bg-brand-dark" : "bg-white"} transition-all duration-300 ease-out group-hover:w-full`}></span>
  </a>
);

function Navbar({ theme = "dark" }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isDarkText = scrolled || theme === "dark";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
        ? "bg-brand-light/80 backdrop-blur-[8px] shadow-sm"
        : "bg-transparent"
        }`}
    >
      <div
        className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-500 ${scrolled ? "py-4" : "py-5"
          }`}
      >
        <Link to="/" className="flex items-center gap-2 group">
          <div className={`text-2xl font-black tracking-tighter ${isDarkText ? "text-brand-dark" : "text-white"}`}>
            <img
              src="/intervista full logo 4.svg"
              className={`w-[180px] h-[80px] object-contain transition-all duration-500 ${
                isDarkText
                  ? "brightness-100 drop-shadow-none"
                  : "brightness-0 invert drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]"
              }`}
            />
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/about" className={`relative group text-sm font-bold ${isDarkText ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/90 hover:text-white"} transition-colors py-1`}>
            About Us
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] ${isDarkText ? "bg-brand-dark" : "bg-white"} transition-all duration-300 ease-out group-hover:w-full`}></span>
          </Link>
          <Link to="/features" className={`relative group text-sm font-bold ${isDarkText ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/90 hover:text-white"} transition-colors py-1`}>
            Features
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] ${isDarkText ? "bg-brand-dark" : "bg-white"} transition-all duration-300 ease-out group-hover:w-full`}></span>
          </Link>
          <Link to="/how-it-works" className={`relative group text-sm font-bold ${isDarkText ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/90 hover:text-white"} transition-colors py-1`}>
            How It Works
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] ${isDarkText ? "bg-brand-dark" : "bg-white"} transition-all duration-300 ease-out group-hover:w-full`}></span>
          </Link>
          <Link to="/privacy-policy" className={`relative group text-sm font-bold ${isDarkText ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/90 hover:text-white"} transition-colors py-1`}>
            Privacy Policy
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] ${isDarkText ? "bg-brand-dark" : "bg-white"} transition-all duration-300 ease-out group-hover:w-full`}></span>
          </Link>
          <Link to="/pricing" className={`relative group text-sm font-bold ${isDarkText ? "text-brand-dark/70 hover:text-brand-dark" : "text-white/90 hover:text-white"} transition-colors py-1`}>
            Pricing
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] ${isDarkText ? "bg-brand-dark" : "bg-white"} transition-all duration-300 ease-out group-hover:w-full`}></span>
          </Link>

          {/* ── Take Test Button ── */}
          <Link
            to="/login"
            className={`relative px-6 py-2.5 text-sm font-bold tracking-wider rounded-lg border overflow-hidden group
              active:scale-95 transition-all duration-300 hover:scale-[1.04] hover:shadow-lg
              ${isDarkText
                ? "bg-brand-dark text-brand-secondary border-brand-dark hover:shadow-brand-dark/30"
                : "bg-white text-brand-dark border-white hover:shadow-white/20"
              }`}
          >
            {/* sliding fill */}
            <span
              className={`absolute inset-0 w-0 transition-all duration-500 ease-out group-hover:w-full z-0
                ${isDarkText ? "bg-white" : "bg-brand-dark"}`}
            />
            {/* label — flips colour on hover */}
            <span
              className={`relative z-10 transition-colors duration-500
                ${isDarkText
                  ? "text-brand-secondary group-hover:text-brand-dark"
                  : "text-brand-dark group-hover:text-brand-secondary"
                }`}
            >
              Take Test
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;