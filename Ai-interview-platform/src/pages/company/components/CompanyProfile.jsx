import React, { useState, useEffect, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  FiEdit2, FiSave, FiX, FiGlobe, FiMail, FiPhone, FiMapPin,
  FiLinkedin, FiGithub, FiCalendar, FiUsers, FiBriefcase,
  FiFileText, FiCamera, FiCheckCircle, FiAlertCircle,
  FiLoader, FiCreditCard, FiMoreHorizontal
} from "react-icons/fi";

// ── helpers ──────────────────────────────────────────────────────────────────
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL("image/jpeg");
}

// ── sub-components ────────────────────────────────────────────────────────────
const SidebarSection = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-sm font-bold text-gray-900 mb-4">{title}</h3>
    <div className="flex flex-col gap-4">
      {children}
    </div>
    <div className="h-px bg-gray-100 mt-8 w-full" />
  </div>
);

const SidebarField = ({ icon: Icon, label, value, name, type = "text", onChange, editing, readOnly, options }) => {
  if (!editing && !value) return null; // hide empty fields in view mode

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm">
      <div className="flex items-center gap-2 text-gray-500 w-28 shrink-0">
        <Icon size={14} />
        <span>{label}:</span>
      </div>
      <div className="flex-1 text-gray-900 font-medium min-w-0">
        {options ? (
          editing && !readOnly ? (
            <select
              name={name}
              value={value || ""}
              onChange={onChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#144542] focus:ring-1 focus:ring-[#144542] transition-all"
            >
              <option value="">—</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <span className="block break-words whitespace-pre-wrap">{value}</span>
          )
        ) : (
          editing && !readOnly ? (
            <input
              type={type}
              name={name}
              value={value || ""}
              onChange={onChange}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#144542] focus:ring-1 focus:ring-[#144542] transition-all"
            />
          ) : (
            <span className="block break-words whitespace-pre-wrap">{value}</span>
          )
        )}
      </div>
    </div>
  );
};

const MainField = ({ label, value, name, type = "text", onChange, editing, multiline }) => {
  if (!editing && !value && !multiline) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      {editing ? (
        multiline ? (
          <textarea
            name={name}
            value={value || ""}
            onChange={onChange}
            rows={4}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 focus:outline-none focus:border-[#144542] focus:ring-1 focus:ring-[#144542] transition-all resize-none"
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value || ""}
            onChange={onChange}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#144542] focus:ring-1 focus:ring-[#144542] transition-all"
          />
        )
      ) : (
        multiline ? (
          <p className="text-sm text-gray-800 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            {value || <span className="text-gray-400 italic">No description provided.</span>}
          </p>
        ) : (
          <p className="text-sm text-gray-900 font-medium">{value}</p>
        )
      )}
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────
export default function CompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // logo cropper
  const fileInputRef = useRef(null);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) return;

    fetch("/api/company/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const mapped = {
          name: data.name || data.companyName || "",
          email: data.email || localStorage.getItem("companyEmail") || "",
          contactNo: data.contactNo || data.phone || "",
          website: data.website || "",
          industry: data.industry || "",
          companySize: data.companySize || "",
          foundedYear: data.foundedYear ? String(data.foundedYear) : "",
          description: data.description || "",
          logoUrl: data.logoUrl || data.logo || "",
          addressLine1: data.addressLine1 || "",
          addressLine2: data.addressLine2 || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          postalCode: data.postalCode || "",
          linkedinUrl: data.linkedinUrl || "",
          githubUrl: data.githubUrl || "",
          billingName: data.billingName || "",
          billingEmail: data.billingEmail || data.email || "",
          billingPhone: data.billingPhone || "",
          gstin: data.gstin || "",
          isGstRegistered: data.isGstRegistered || false,
        };
        setProfile(mapped);
        setForm(mapped);
      })
      .catch(() => setStatus({ type: "error", msg: "Failed to load profile." }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: t === "checkbox" ? checked : value }));
  };

  const handleCancel = () => { setForm(profile); setEditing(false); setStatus({ type: "", msg: "" }); };

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: "", msg: "" });
    try {
      const token = localStorage.getItem("companyToken");
      const res = await fetch("/api/company/profile/info", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          website:         form.website        || null,
          industry:        form.industry       || null,
          companySize:     form.companySize    || null,
          foundedYear:     parseInt(form.foundedYear) || null,
          description:     form.description    || null,
          logoUrl:         form.logoUrl        || null,
          addressLine1:    form.addressLine1   || null,
          addressLine2:    form.addressLine2   || null,
          city:            form.city           || null,
          state:           form.state          || null,
          country:         form.country        || null,
          postalCode:      form.postalCode     || null,
          linkedinUrl:     form.linkedinUrl    || null,
          githubUrl:       form.githubUrl      || null,
          billingName:     form.billingName    || null,
          billingEmail:    form.billingEmail   || null,
          billingPhone:    form.billingPhone   || null,
          gstin:           form.gstin          || null,
          isGstRegistered: form.isGstRegistered || false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setProfile({ ...form });
      setEditing(false);
      setStatus({ type: "success", msg: "Profile updated successfully!" });
      setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Save failed. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // ── logo cropper handlers ──────────────────────────────────────────────────
  const handleLogoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setImageToCrop(reader.result); setShowCropper(true); };
    reader.readAsDataURL(file);
  };

  const saveCrop = async () => {
    const cropped = await getCroppedImg(imageToCrop, croppedAreaPixels);
    setForm((prev) => ({ ...prev, logoUrl: cropped }));
    setImageToCrop(null);
    setShowCropper(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelCrop = () => { setImageToCrop(null); setShowCropper(false); if (fileInputRef.current) fileInputRef.current.value = ""; };

  // ── constants ──────────────────────────────────────────────────────────────
  const industries = ["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Retail", "Logistics", "Media", "Real Estate", "Other"];
  const sizes = ["1-10", "11-50", "51-200", "201-500", "501+"];

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f9fafb]">
        <div className="w-9 h-9 border-4 border-[#144542] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const data = editing ? form : profile || {};
  const displayCityState = [data.city, data.state].filter(Boolean).join(", ");

  return (
    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar flex justify-center">
      
      {/* Cropper overlay */}
      {showCropper && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <p className="font-bold text-sm text-gray-800 mb-4">Crop Logo</p>
            <div className="relative w-full h-64 bg-black/10 rounded-xl overflow-hidden">
              <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1}
                onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
            <div className="mt-4 mb-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Zoom</label>
              <input type="range" min={1} max={3} step={0.1} value={zoom}
                onChange={(e) => setZoom(e.target.value)} className="w-full accent-[#144542]" />
            </div>
            <div className="flex gap-3">
              <button onClick={saveCrop} className="flex-1 py-2.5 bg-[#144542] text-white text-sm font-bold rounded-xl hover:bg-[#144542]/90 transition-all flex items-center justify-center gap-2">
                <FiCheckCircle size={14} /> Save Crop
              </button>
              <button onClick={cancelCrop} className="flex-1 py-2.5 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                <FiX size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="w-full max-w-[1300px] flex flex-col md:flex-row min-h-full">
        
        {/* ── LEFT COLUMN (Sidebar) ── */}
        <div className="w-full md:w-[400px] shrink-0 border-r border-gray-100 p-8 md:pr-10 bg-white">
          
          {/* Header (Logo + Name) */}
          <div className="flex items-center gap-4 mb-10 relative group">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-xl bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-orange-400">
                    {data.name ? data.name.charAt(0).toUpperCase() : <FiBriefcase />}
                  </span>
                )}
              </div>
              {editing && (
                <>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#144542] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#144542]/90 transition-all z-10">
                    <FiCamera size={10} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 truncate pr-2">
                  {editing ? (
                    <input type="text" name="name" value={data.name || ""} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-base focus:outline-none focus:border-[#144542]" placeholder="Company Name" />
                  ) : (
                    data.name || "Company Name"
                  )}
                </h2>
                {!editing && <FiMoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 shrink-0" />}
              </div>
              <p className="text-sm text-gray-500 mt-1 truncate">
                {editing ? (
                  <input type="text" name="industry" value={data.industry || ""} onChange={handleChange} placeholder="Industry" className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none" />
                ) : (
                  `#${data.industry || "Industry"}`
                )}
              </p>
            </div>
          </div>

          {/* About Section */}
          <SidebarSection title="About">
            <SidebarField icon={FiPhone} label="Phone" name="contactNo" value={data.contactNo} onChange={handleChange} editing={editing} />
            <SidebarField icon={FiMail} label="Email" name="email" value={data.email} onChange={handleChange} editing={editing} readOnly />
            <SidebarField icon={FiGlobe} label="Website" name="website" value={data.website} onChange={handleChange} editing={editing} />
          </SidebarSection>

          {/* Address Section */}
          <SidebarSection title="Address">
            <SidebarField icon={FiBriefcase} label="Address" name="addressLine1" value={data.addressLine1} onChange={handleChange} editing={editing} />
            <SidebarField icon={FiMapPin} label="City state" name="city" value={editing ? data.city : displayCityState} onChange={handleChange} editing={editing} />
            {editing && <SidebarField icon={FiMapPin} label="State" name="state" value={data.state} onChange={handleChange} editing={editing} />}
            <SidebarField icon={FiMapPin} label="Postcode" name="postalCode" value={data.postalCode} onChange={handleChange} editing={editing} />
            <SidebarField icon={FiGlobe} label="Country" name="country" value={data.country} onChange={handleChange} editing={editing} />
          </SidebarSection>

          {/* Company details Section */}
          <SidebarSection title="Company details">
            <SidebarField icon={FiCalendar} label="Founded" name="foundedYear" type="number" value={data.foundedYear} onChange={handleChange} editing={editing} />
            <SidebarField icon={FiUsers} label="Size" name="companySize" value={data.companySize} onChange={handleChange} editing={editing} options={sizes} />
            <SidebarField icon={FiLinkedin} label="LinkedIn" name="linkedinUrl" value={data.linkedinUrl} onChange={handleChange} editing={editing} />
            <SidebarField icon={FiGithub} label="GitHub" name="githubUrl" value={data.githubUrl} onChange={handleChange} editing={editing} />
          </SidebarSection>
          
        </div>

        {/* ── RIGHT COLUMN (Main Content) ── */}
        <div className="flex-1 p-8 md:pl-12 bg-white">
          
          {/* Header Actions */}
          <div className="flex items-start justify-between mb-10">
            <h1 className="text-xl font-bold text-gray-900 mt-1">Company Information</h1>
            <div>
              {editing ? (
                <div className="flex items-center gap-3">
                  <button onClick={handleCancel} className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#144542] rounded-lg hover:bg-[#144542]/90 transition-all disabled:opacity-60">
                    {saving ? <FiLoader size={14} className="animate-spin" /> : <FiSave size={14} />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-[#144542] bg-white border border-[#144542]/20 rounded-xl hover:bg-[#144542]/5 hover:border-[#144542]/40 transition-all shadow-sm">
                  <FiEdit2 size={15} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Status Banner */}
          {status.msg && (
            <div className={`flex items-center gap-3 p-4 rounded-xl mb-8 text-sm font-medium ${
              status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {status.type === "success" ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
              {status.msg}
            </div>
          )}

          {/* Main Content Area */}
          <div className="max-w-4xl">
            
            {/* Description */}
            <div className="mb-12">
              <MainField label="Company Description" name="description" value={data.description} onChange={handleChange} editing={editing} multiline />
            </div>

            {/* Billing Information Table-like Layout */}
            <div className="mb-12">
              <h3 className="text-base font-bold text-gray-900 mb-6">Billing & Tax Information</h3>
              
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <MainField label="Billing Name" name="billingName" value={data.billingName} onChange={handleChange} editing={editing} />
                  <MainField label="Billing Email" name="billingEmail" value={data.billingEmail} onChange={handleChange} editing={editing} />
                  <MainField label="Billing Phone" name="billingPhone" value={data.billingPhone} onChange={handleChange} editing={editing} />
                  <MainField label="GSTIN" name="gstin" value={data.gstin} onChange={handleChange} editing={editing} />
                  
                  <div className="md:col-span-2 mt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input type="checkbox" name="isGstRegistered" checked={form.isGstRegistered || false} onChange={handleChange} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#144542]"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 group-hover:text-[#144542] transition-colors">Company is GST Registered</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead>
                      <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-3 pr-6 font-medium">Billing Entity</th>
                        <th className="pb-3 px-6 font-medium">Contact Details</th>
                        <th className="pb-3 px-6 font-medium">Tax Info (GSTIN)</th>
                        <th className="pb-3 pl-6 font-medium">Status</th>
                        <th className="pb-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr className="group">
                        <td className="py-4 pr-6">
                          <p className="font-medium text-gray-900">{data.billingName || "—"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Primary Billing</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-gray-800">{data.billingEmail || "—"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{data.billingPhone}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-gray-800">{data.gstin || "—"}</p>
                        </td>
                        <td className="py-4 pl-6">
                          {data.isGstRegistered ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              Registered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              Unregistered
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <FiMoreHorizontal className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-gray-600 transition-all" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {(!data.billingName && !data.billingEmail && !data.gstin) && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      No billing information available. Click 'Edit Profile' to add.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
