import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FaFileInvoiceDollar, FaRegEnvelope, FaPhone, FaUser, 
  FaMapMarkerAlt, FaGlobe, FaCheckCircle, FaExclamationCircle,
  FaBuilding, FaSearch
} from "react-icons/fa";

const BillingInfoStep = ({ formData, handleInputChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gstVerified, setGstVerified] = useState(false);

  const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", 
    "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", 
    "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", 
    "Cote d'Ivoire", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", 
    "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", 
    "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", 
    "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", 
    "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", 
    "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", 
    "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", 
    "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", 
    "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", 
    "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", 
    "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", 
    "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", 
    "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", 
    "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", 
    "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", 
    "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", 
    "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", 
    "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];

  const verifyGST = async (gstValue = formData.gstin) => {
    if (!gstValue || gstValue.length !== 15) {
      setError("GST must be 15 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setGstVerified(false);

      // Using a free public proxy for GST verification
      const res = await fetch(`https://sheet.gstincheck.co.in/check/6ec96388780526640d92874e01cf622d/${gstValue}`);
      const result = await res.json();

      if (result.flag && result.data) {
        setGstVerified(true);
        const data = result.data;
        const address = data.pradr?.addr || {};
        const fullAddressStr = data.pradr?.adr || "";
        
        // Auto populate fields
        handleInputChange({ target: { name: "billingName", value: data.lgnm || data.tradeNam || formData.billingName } });
        handleInputChange({ target: { name: "billingState", value: address.stcd || formData.billingState } });
        
        // Map address fields
        const line1 = `${address.bnm || ""} ${address.st || ""}`.trim() || fullAddressStr.split(',')[0];
        const city = address.dst || address.city || "";
        const postalCode = address.pncd || "";
        
        handleInputChange({ target: { name: "billingLine1", value: line1 } });
        handleInputChange({ target: { name: "billingCity", value: city } });
        handleInputChange({ target: { name: "billingPostalCode", value: postalCode } });
        
        // Optional: populate line2 with locality if available
        if (address.loc) {
          handleInputChange({ target: { name: "billingLine2", value: address.loc } });
        }
      } else {
        setError(result.message || "Invalid GST Number");
      }
    } catch (err) {
      setError("Verification failed. Please check your API key or connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleGSTChange = (e) => {
    const value = e.target.value.toUpperCase();
    handleInputChange({ target: { name: "gstin", value } });
    
    if (value.length === 15) {
      verifyGST(value);
    } else {
      setGstVerified(false);
      setError("");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-10"
    >
      <div>
        <h2 className="text-sm font-bold text-brand-dark/50 uppercase tracking-wider mb-6">Billing Setup</h2>
        
        <div className="space-y-6">
          {/* GST Registration Status */}
          <div className="flex items-center gap-3 p-4 bg-brand-light/20 rounded-2xl border border-brand-light">
             <div className="flex-1">
                <p className="text-sm font-bold text-brand-dark">Is your business GST registered?</p>
                <p className="text-xs text-brand-gray">Provides access to tax credits and compliant invoicing.</p>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="isGstRegistered" 
                  checked={formData.isGstRegistered} 
                  onChange={(e) => handleInputChange({ target: { name: "isGstRegistered", value: e.target.checked } })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-dark"></div>
             </label>
          </div>

          {formData.isGstRegistered && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="space-y-2"
            >
              <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">GSTIN (15 Digits) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray">
                  {loading ? <div className="w-3.5 h-3.5 border-2 border-brand-dark border-t-transparent animate-spin rounded-full"></div> : <FaFileInvoiceDollar size={14}/>}
                </span>
                <input 
                  type="text" 
                  name="gstin" 
                  value={formData.gstin} 
                  onChange={handleGSTChange}
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  maxLength={15}
                  className={`w-full pl-10 pr-24 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm font-mono uppercase ${gstVerified ? 'border-green-300 focus:border-green-500' : error ? 'border-red-300 focus:border-red-500' : 'border-brand-light focus:border-brand-dark'}`}
                />
                <button 
                  type="button"
                  onClick={() => verifyGST()}
                  disabled={loading || formData.gstin.length !== 15}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-light/50 text-brand-dark text-[10px] font-bold rounded-lg hover:bg-brand-light transition-all disabled:opacity-50"
                >
                  {gstVerified ? "VERIFIED" : "VERIFY"}
                </button>
              </div>
              {error && <p className="text-[10px] text-red-600 font-bold flex items-center gap-1 pl-1"><FaExclamationCircle /> {error}</p>}
              {gstVerified && <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 pl-1"><FaCheckCircle /> GST details verified successfully</p>}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Billing Name *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaUser size={14}/></span>
                <input 
                  type="text" name="billingName" value={formData.billingName} onChange={handleInputChange}
                  placeholder="Full name or Company name"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Billing Email * (Fixed)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaRegEnvelope size={14}/></span>
                <input 
                  type="email" name="billingEmail" value={formData.billingEmail} onChange={handleInputChange}
                  placeholder="billing@company.com"
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-brand-light rounded-xl focus:ring-0 transition-all text-sm cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Billing Phone *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaPhone size={14}/></span>
                <input 
                  type="text" name="billingPhone" value={formData.billingPhone} onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Country *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaGlobe size={14}/></span>
                <select 
                  name="billingCountry" value={formData.billingCountry} onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm appearance-none"
                >
                  <option value="">Select Country</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-gray text-[10px]">▼</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-brand-light">
        <h2 className="text-sm font-bold text-brand-dark/50 uppercase tracking-wider mb-6">Address Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Address Line 1 *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaMapMarkerAlt size={14}/></span>
              <input 
                type="text" name="billingLine1" value={formData.billingLine1} onChange={handleInputChange}
                placeholder="Street address, Suite, etc."
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Address Line 2 (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaBuilding size={14}/></span>
              <input 
                type="text" name="billingLine2" value={formData.billingLine2} onChange={handleInputChange}
                placeholder="Apartment, unit, floor, etc."
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">City *</label>
            <input 
              type="text" name="billingCity" value={formData.billingCity} onChange={handleInputChange}
              placeholder="City"
              className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">State *</label>
              <input 
                type="text" name="billingState" value={formData.billingState} onChange={handleInputChange}
                placeholder="State"
                className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Zip Code *</label>
              <input 
                type="text" name="billingPostalCode" value={formData.billingPostalCode} onChange={handleInputChange}
                placeholder="ZIP"
                className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BillingInfoStep;
