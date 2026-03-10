import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDesign } from '../services/design.service';
import toast from 'react-hot-toast';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

const UploadDesign = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(0);
    const [category, setCategory] = useState('routers');
    const [previewFile, setPreviewFile] = useState(null);
    const [cncFile, setCncFile] = useState(null);

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!previewFile || !cncFile) {
            toast.error('Both a preview image and the CNC file are required!');
            return;
        }

        if (previewFile.size > 2 * 1024 * 1024) {
            toast.error('Preview image must be less than 2MB');
            return;
        }

        if (cncFile.size > 50 * 1024 * 1024) {
            toast.error('CNC file must be less than 50MB');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('price', Number(price));
            formData.append('category', category);
            formData.append('preview', previewFile);
            formData.append('cnc', cncFile);

            await uploadDesign(formData);

            toast.success('Design uploaded successfully!');
            navigate('/');
        } catch (error) {
            // Fix #7: axios errors carry the real message in error.response.data.error
            toast.error(error.response?.data?.error || error.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-24 font-sans selection:bg-black selection:text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Upload New Design
                    </h1>
                    <p className="text-gray-500 font-medium text-sm mt-2">Publish premium CNC files and start earning instantly.</p>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8 sm:p-12">

                        <div className="space-y-8">
                            {/* Basic Info */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">1</span> Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Design Title</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                            placeholder="e.g., 3D Parametric Wooden Elephant"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Detailed Description</label>
                                        <textarea
                                            name="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            required
                                            rows={5}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                            placeholder="Describe materials, tools used, and assembly instructions..."
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                        <select
                                            name="category"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            required
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900"
                                        >
                                            <option value="routers">Wood Routers</option>
                                            <option value="spindles">Spindles & Turning</option>
                                            <option value="carvings">3D Carvings / Bas Reliefs</option>
                                            <option value="furniture">Furniture Plans</option>
                                            <option value="reliefs">Panel Reliefs</option>
                                            <option value="v-bits">V-Bit Engraving</option>
                                            <option value="2d-designs">2D Designs</option>
                                            <option value="2d-grill-designs">2D Grill Designs</option>
                                            <option value="3d-designs">3D Designs</option>
                                            <option value="3d-traditional">3D Traditional Designs</option>
                                            <option value="temple-designs">Temple Designs</option>
                                            <option value="3d-doors-design">3D Doors Design</option>
                                            <option value="3d-modern-panel-doors">3D Modern Panel Doors</option>
                                            <option value="3d-latest-panel-door">3D Latest Panel Door</option>
                                            <option value="3d-borderless-mdf-door">3D Borderless MDF Door</option>
                                            <option value="3d-traditional-panel-door">3D Traditional Panel Door</option>
                                            <option value="3d-unique-door">3D Unique Door</option>
                                            <option value="other">Other / General</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Price (INR)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                            <input
                                                type="number"
                                                name="price"
                                                min="0"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                required
                                                className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                                                placeholder="0 for free"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium mt-2 flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Free designs will show as "Download Free"</p>
                                    </div>
                                </div>
                            </div>

                            {/* Files */}
                            <div className="pt-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">2</span> Attached Files
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 border-dashed hover:border-blue-400 hover:bg-blue-50/50 transition-colors group">
                                        <label className="block text-sm font-bold text-gray-900 mb-3 cursor-pointer">Preview Image (Cover)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPreviewFile(e.target.files[0])}
                                            required
                                            className="w-full text-sm font-medium text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#111] file:text-white hover:file:bg-black cursor-pointer"
                                        />
                                        <p className="text-xs text-gray-400 mt-4 leading-relaxed font-medium">Use high-quality 4:3 images (JPG, PNG, WEBP). Recommended size: 1200x900px. Max 2MB.</p>
                                    </div>

                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 border-dashed hover:border-purple-400 hover:bg-purple-50/50 transition-colors group">
                                        <label className="block text-sm font-bold text-gray-900 mb-3 cursor-pointer">CNC Source File</label>
                                        <input
                                            type="file"
                                            accept=".dxf,.stl,.svg,.obj,.nc,.gcode,.tap,.ngc"
                                            onChange={(e) => setCncFile(e.target.files[0])}
                                            required
                                            className="w-full text-sm font-medium text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                                        />
                                        <p className="text-xs text-gray-400 mt-4 leading-relaxed font-medium">Supported: DXF, STL, SVG, OBJ, NC, GCODE. Max 50MB.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-xs text-gray-400 font-medium max-w-sm">By publishing, you agree to our creator terms. Files are securely distributed via Cloudflare R2.</p>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-10 py-4 bg-[#111] text-white rounded-full font-bold text-[15px] shadow-sm hover:shadow-xl hover:bg-black hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud size={18} /> Publish to Store
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UploadDesign;
