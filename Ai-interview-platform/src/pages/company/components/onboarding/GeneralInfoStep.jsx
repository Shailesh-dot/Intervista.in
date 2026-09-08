import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Cropper from "react-easy-crop";
import { 
  FaBuilding, FaGlobe, FaIndustry, FaUsers, FaCalendarAlt, 
  FaLinkedin, FaGithub, FaUpload, FaTrash, FaImage, FaCheckCircle
} from "react-icons/fa";

// Helper to extract cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )
  return canvas.toDataURL('image/jpeg')
}

const GeneralInfoStep = ({ formData, handleInputChange, setFormData }) => {
  const fileInputRef = useRef(null);
  
  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result); // Show cropper
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      setFormData(prev => ({ ...prev, logoUrl: croppedImage }));
      setImageToCrop(null); // Hide cropper
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      console.error(e);
    }
  };

  const clearLogo = (e) => {
    if(e) e.stopPropagation();
    setFormData(prev => ({ ...prev, logoUrl: "" }));
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-sm font-bold text-brand-dark/50 uppercase tracking-wider mb-6">General Company Details</h2>
        
        <div className="mb-8">
          <label className="block text-xs font-bold text-brand-dark mb-3 pl-1">Company Logo *</label>
          <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${formData.logoUrl || imageToCrop ? 'border-brand-light bg-brand-light/20' : 'border-brand-gray/30 hover:border-brand-dark/30 hover:bg-brand-light/30 text-center cursor-pointer'}`} onClick={() => !formData.logoUrl && !imageToCrop && fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoChange} 
              accept="image/*" 
              className="hidden" 
            />
            {imageToCrop ? (
              <div className="flex flex-col gap-4">
                <div className="relative w-full h-64 bg-black/5 rounded-xl overflow-hidden">
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-brand-gray uppercase mb-2">Zoom</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(e.target.value)}
                    className="w-full accent-brand-dark"
                  />
                </div>
                <div className="flex gap-3">
                   <button type="button" onClick={saveCroppedImage} className="text-xs font-bold px-4 py-2 bg-brand-dark text-white rounded-lg hover:bg-brand-dark/90 transition-all flex items-center gap-2">
                     <FaCheckCircle /> Save Crop
                   </button>
                   <button type="button" onClick={clearLogo} className="text-xs font-bold px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 transition-all flex items-center gap-2">
                     <FaTrash /> Cancel
                   </button>
                </div>
              </div>
            ) : formData.logoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="bg-white p-2 rounded-xl border border-brand-light shadow-sm flex items-center justify-center overflow-hidden w-24 h-24 shrink-0">
                  <img src={formData.logoUrl} alt="Company Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-4 w-full sm:w-auto">
                  <div className="flex gap-3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-xs font-bold px-4 py-2 bg-white border border-brand-light text-brand-dark rounded-lg hover:bg-brand-light transition-all flex items-center gap-2">
                      <FaUpload /> Change
                    </button>
                    <button type="button" onClick={clearLogo} className="text-xs font-bold px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-lg hover:bg-red-100 transition-all flex items-center gap-2">
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-gray shadow-sm mb-3">
                  <FaImage size={20} />
                </div>
                <p className="text-sm font-bold text-brand-dark mb-1">Click to upload logo</p>
                <p className="text-xs text-brand-gray">SVG, PNG, JPG or GIF (max. 5MB)</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Website URL (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaGlobe size={14}/></span>
              <input 
                type="url" name="website" value={formData.website} onChange={handleInputChange}
                placeholder="https://example.com"
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Industry *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaIndustry size={14}/></span>
              <select 
                name="industry" value={formData.industry} onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm appearance-none"
              >
                <option value="">Select Industry</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Manufacturing">Manufacturing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Company Size *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaUsers size={14}/></span>
              <select 
                name="companySize" value={formData.companySize} onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm appearance-none"
              >
                <option value="">Select Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501+">501+ employees</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Founded Year *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaCalendarAlt size={14}/></span>
              <input 
                type="number" name="foundedYear" value={formData.foundedYear || ""} onChange={handleInputChange}
                placeholder="e.g. 2015"
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Description *</label>
          <textarea 
            name="description" value={formData.description} onChange={handleInputChange}
            placeholder="Tell us about your company..."
            className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm h-32 resize-none"
          />
        </div>
      </div>

      <div className="pt-8 border-t border-brand-light">
        <h2 className="text-sm font-bold text-brand-dark/50 uppercase tracking-wider mb-6">Company Location</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Address Line 1 *</label>
            <input 
              type="text" name="addressLine1" value={formData.addressLine1} onChange={handleInputChange}
              placeholder="Street address, P.O. box"
              className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Address Line 2 (Optional)</label>
            <input 
              type="text" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange}
              placeholder="Apartment, suite, unit, building, floor, etc."
              className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">City *</label>
            <input 
              type="text" name="city" value={formData.city} onChange={handleInputChange}
              placeholder="City"
              className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">State / Province *</label>
            <input 
              type="text" name="state" value={formData.state} onChange={handleInputChange}
              placeholder="State"
              className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Country *</label>
            <input 
              type="text" name="country" value={formData.country} onChange={handleInputChange}
              placeholder="Country"
              className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">Postal Code *</label>
            <input 
              type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange}
              placeholder="ZIP Code"
              className="w-full px-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-brand-light">
        <h2 className="text-sm font-bold text-brand-dark/50 uppercase tracking-wider mb-6">Social Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">LinkedIn Profile (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaLinkedin size={14}/></span>
              <input 
                type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleInputChange}
                placeholder="linkedin.com/company/..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-2 pl-1">GitHub Profile (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray"><FaGithub size={14}/></span>
              <input 
                type="url" name="githubUrl" value={formData.githubUrl} onChange={handleInputChange}
                placeholder="github.com/..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-brand-light rounded-xl focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GeneralInfoStep;
